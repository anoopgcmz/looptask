import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { z } from 'zod';
import dbConnect from '@/lib/db';
import { withOrganization } from '@/lib/middleware/withOrganization';
import { problem } from '@/lib/http';
import { Project } from '@/models/Project';
import { User } from '@/models/User';
import type { TaskPayload, TaskStepPayload } from '@/types/api/task';
import { completeJsonChat } from '@/lib/ai/openai';

export const runtime = 'nodejs';

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_REQUESTS = 5;

type RateLimitEntry = {
  count: number;
  expiresAt: number;
};

const rateLimitMap = new Map<string, RateLimitEntry>();

const requestSchema = z.object({
  prompt: z.string().trim().min(1, 'Prompt is required'),
  projectHints: z.array(z.string().trim().min(1)).max(10).optional(),
  userHints: z.array(z.string().trim().min(1)).max(10).optional(),
  options: z
    .object({
      draftCount: z.number().int().min(1).max(5).default(2).optional(),
      temperature: z.number().min(0).max(1).optional(),
    })
    .optional(),
});

const aiDraftSchema = z.object({
  drafts: z
    .array(
      z.object({
        title: z.string().trim().min(1),
        description: z.string().optional(),
        priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
        project: z
          .object({
            id: z.string().optional(),
            name: z.string().optional(),
          })
          .optional(),
        owner: z
          .object({
            id: z.string().optional(),
            name: z.string().optional(),
          })
          .optional(),
        steps: z
          .array(
            z.object({
              title: z.string().trim().min(1),
              description: z.string().optional(),
              owner: z
                .object({
                  id: z.string().optional(),
                  name: z.string().optional(),
                })
                .optional(),
              dueDate: z.string().optional(),
              status: z.enum(['OPEN', 'IN_PROGRESS', 'DONE']).optional(),
            }),
          )
          .max(20)
          .optional(),
        confidenceWarnings: z.array(z.string()).optional(),
      }),
    )
    .min(1),
});

type AiDraft = z.infer<typeof aiDraftSchema>['drafts'][number];

interface MatchedEntity<T> {
  matched: boolean;
  resolved: T;
  provided?: string;
}

interface DraftConfidence {
  project: MatchedEntity<string>;
  owner: MatchedEntity<string>;
  steps: Array<{
    owner: MatchedEntity<string>;
    dueDateValid: boolean;
  }>;
  warnings: string[];
}

interface DraftResponse {
  id: string;
  payload: TaskPayload;
  confidence: DraftConfidence;
}

const normalize = (value: string | undefined | null) =>
  value?.trim().toLowerCase() ?? '';

const hitRateLimit = (key: string) => {
  const now = Date.now();
  const current = rateLimitMap.get(key);
  if (!current || current.expiresAt < now) {
    rateLimitMap.set(key, { count: 1, expiresAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  if (current.count >= RATE_LIMIT_REQUESTS) {
    return true;
  }
  current.count += 1;
  rateLimitMap.set(key, current);
  return false;
};

const buildSystemPrompt = (params: {
  projects: Array<{ id: string; name: string }>;
  users: Array<{ id: string; name: string }>;
  draftCount: number;
}) => {
  const projectList = params.projects
    .map((project) => `- ${project.name} (id: ${project.id})`)
    .join('\n');
  const userList = params.users
    .map((user) => `- ${user.name} (id: ${user.id})`)
    .join('\n');
  return [
    'You are an assistant that drafts LoopTask tasks for project teams.',
    'Use the provided organization context to keep identifiers exact.',
    'Return valid JSON only. Never include markdown or explanations.',
    `Always produce up to ${params.draftCount} drafts unless fewer make sense.`,
    'Schema:',
    '{',
    '  "drafts": [',
    '    {',
    '      "title": string,',
    '      "description": string,',
    '      "priority": "LOW" | "MEDIUM" | "HIGH",',
    '      "project": { "id"?: string, "name"?: string },',
    '      "owner": { "id"?: string, "name"?: string },',
    '      "steps": [',
    '        {',
    '          "title": string,',
    '          "description"?: string,',
    '          "owner"?: { "id"?: string, "name"?: string },',
    '          "dueDate"?: ISO 8601 date string,',
    '          "status"?: "OPEN" | "IN_PROGRESS" | "DONE"',
    '        }',
    '      ],',
    '      "confidenceWarnings"?: string[]',
    '    }',
    '  ]',
    '}',
    'If uncertain about a project or user, leave ids blank and note it in confidenceWarnings.',
    'Organization Projects:\n' + (projectList || '- None provided'),
    'Organization Members:\n' + (userList || '- None provided'),
  ].join('\n');
};

const buildUserPrompt = (params: {
  prompt: string;
  projectHints?: string[];
  userHints?: string[];
}) => {
  const lines = [
    'Task intake request:',
    params.prompt.trim(),
  ];
  if (params.projectHints?.length) {
    lines.push(`Project hints: ${params.projectHints.join(', ')}`);
  }
  if (params.userHints?.length) {
    lines.push(`User hints: ${params.userHints.join(', ')}`);
  }
  lines.push('Focus on actionable steps.');
  return lines.join('\n');
};

const resolveProject = (
  draft: AiDraft,
  projectIndex: Map<string, { id: string; name: string }>,
  projectNameIndex: Map<string, { id: string; name: string }>,
  fallbackId: string,
): MatchedEntity<string> => {
  const providedId = draft.project?.id?.trim();
  if (providedId) {
    const match = projectIndex.get(providedId);
    if (match) {
      return { matched: true, resolved: match.id };
    }
  }
  const providedName = draft.project?.name?.trim();
  if (providedName) {
    const match = projectNameIndex.get(normalize(providedName));
    if (match) {
      return { matched: true, resolved: match.id, provided: providedName };
    }
    return { matched: false, resolved: fallbackId, provided: providedName };
  }
  return { matched: Boolean(fallbackId), resolved: fallbackId };
};

const resolveUser = (
  reference:
    | AiDraft['owner']
    | NonNullable<AiDraft['steps']>[number]['owner']
    | undefined,
  userIndex: Map<string, { id: string; name: string }>,
  userNameIndex: Map<string, { id: string; name: string }>,
  fallbackId: string,
): MatchedEntity<string> => {
  const providedId = reference?.id?.trim();
  if (providedId) {
    const match = userIndex.get(providedId);
    if (match) {
      return { matched: true, resolved: match.id };
    }
  }
  const providedName = reference?.name?.trim();
  if (providedName) {
    const match = userNameIndex.get(normalize(providedName));
    if (match) {
      return { matched: true, resolved: match.id, provided: providedName };
    }
    return { matched: false, resolved: fallbackId, provided: providedName };
  }
  return { matched: Boolean(fallbackId), resolved: fallbackId };
};

const parseDueDate = (value: string | undefined | null) => {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }
  return date.toISOString();
};

const toTaskPayload = (
  draft: AiDraft,
  context: {
    ownerFallbackId: string;
    projectFallbackId: string;
    projectIndex: Map<string, { id: string; name: string }>;
    projectNameIndex: Map<string, { id: string; name: string }>;
    userIndex: Map<string, { id: string; name: string }>;
    userNameIndex: Map<string, { id: string; name: string }>;
  },
): DraftResponse => {
  const projectResolution = resolveProject(
    draft,
    context.projectIndex,
    context.projectNameIndex,
    context.projectFallbackId,
  );

  const ownerResolution = resolveUser(
    draft.owner,
    context.userIndex,
    context.userNameIndex,
    context.ownerFallbackId,
  );

  const steps: TaskStepPayload[] = [];
  const stepConfidence: DraftConfidence['steps'] = [];
  for (const step of draft.steps ?? []) {
    const ownerMatch = resolveUser(
      step.owner,
      context.userIndex,
      context.userNameIndex,
      ownerResolution.resolved,
    );
    const dueAt = parseDueDate(step.dueDate);
    stepConfidence.push({
      owner: ownerMatch,
      dueDateValid: Boolean(step.dueDate ? dueAt : true),
    });
    steps.push({
      title: step.title,
      description: step.description ?? undefined,
      ownerId: ownerMatch.resolved,
      dueAt: dueAt ? new Date(dueAt) : undefined,
      status: step.status ?? 'OPEN',
    });
  }

  const payload: TaskPayload = {
    title: draft.title,
    description: draft.description ?? undefined,
    projectId: projectResolution.resolved,
    ownerId: ownerResolution.resolved,
    priority: draft.priority ?? 'LOW',
    steps,
  };

  const warnings = new Set<string>();
  if (!projectResolution.matched) {
    warnings.add('Project needs review');
  }
  if (!ownerResolution.matched) {
    warnings.add('Primary owner needs review');
  }
  stepConfidence.forEach((step, index) => {
    if (!step.owner.matched) {
      warnings.add(`Step ${index + 1} owner needs review`);
    }
    if (!step.dueDateValid) {
      warnings.add(`Step ${index + 1} due date invalid`);
    }
  });
  for (const warning of draft.confidenceWarnings ?? []) {
    warnings.add(warning);
  }

  return {
    id: randomUUID(),
    payload,
    confidence: {
      project: projectResolution,
      owner: ownerResolution,
      steps: stepConfidence,
      warnings: Array.from(warnings),
    },
  };
};

export const POST = withOrganization(async (req, session) => {
  if (hitRateLimit(session.userId)) {
    return problem(429, 'Too Many Requests', 'Please slow down and try again.');
  }

  let body: z.infer<typeof requestSchema>;
  try {
    body = requestSchema.parse(await req.json());
  } catch (error: unknown) {
    const err = error as Error;
    return problem(400, 'Invalid request', err.message);
  }

  await dbConnect();

  const organizationId = new Types.ObjectId(session.organizationId);

  const [projectsRaw, usersRaw] = await Promise.all([
    Project.find({ organizationId }).select('_id name').sort({ name: 1 }).limit(200).lean(),
    User.find({ organizationId, isActive: true })
      .select('_id name email username')
      .sort({ name: 1 })
      .limit(200)
      .lean(),
  ]);

  const projects = projectsRaw.map((project) => ({
    id: project._id.toString(),
    name: project.name,
  }));
  const users = usersRaw.map((user) => ({
    id: user._id.toString(),
    name: user.name,
  }));

  const systemPrompt = buildSystemPrompt({
    projects,
    users,
    draftCount: body.options?.draftCount ?? 2,
  });
  const userPrompt = buildUserPrompt({
    prompt: body.prompt,
    projectHints: body.projectHints,
    userHints: body.userHints,
  });

  const startedAt = Date.now();
  let completionContent = '';
  try {
    const completion = await completeJsonChat({
      systemPrompt,
      userPrompt,
      temperature: body.options?.temperature ?? 0,
    });
    completionContent = completion.content;
  } catch (error: unknown) {
    const err = error as Error;
    console.error('ai.task-intake.request-failed', {
      organizationId: session.organizationId,
      userId: session.userId,
      message: err.message,
    });
    return problem(502, 'Upstream error', 'Unable to generate drafts right now.');
  }

  let parsed: z.infer<typeof aiDraftSchema>;
  try {
    parsed = aiDraftSchema.parse(JSON.parse(completionContent || '{}'));
  } catch (error: unknown) {
    console.error('ai.task-intake.validation-failed', {
      organizationId: session.organizationId,
      userId: session.userId,
      raw: completionContent,
      error,
    });
    return problem(502, 'Upstream error', 'The AI response was invalid.');
  }

  const projectIndex = new Map(projects.map((project) => [project.id, project]));
  const projectNameIndex = new Map(
    projects.map((project) => [normalize(project.name), project]),
  );
  const userIndex = new Map(users.map((user) => [user.id, user]));
  const userNameIndex = new Map(users.map((user) => [normalize(user.name), user]));

  const fallbackProjectId = projects[0]?.id ?? '';
  const fallbackOwnerId = session.userId;

  const drafts = parsed.drafts.map((draft) =>
    toTaskPayload(draft, {
      ownerFallbackId: fallbackOwnerId,
      projectFallbackId: fallbackProjectId,
      projectIndex,
      projectNameIndex,
      userIndex,
      userNameIndex,
    }),
  );

  console.info('ai.task-intake.completed', {
    organizationId: session.organizationId,
    userId: session.userId,
    drafts: drafts.length,
    latencyMs: Date.now() - startedAt,
    warnings: drafts.flatMap((draft) => draft.confidence.warnings).length,
  });

  return NextResponse.json({ drafts });
});

