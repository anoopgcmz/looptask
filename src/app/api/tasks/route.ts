import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Types } from 'mongoose';
import dbConnect from '@/lib/db';
import Task from '@/models/Task';
import type { ITask } from '@/models/Task';
import ActivityLog from '@/models/ActivityLog';
import User from '@/models/User';
import { notifyAssignment, notifyMention } from '@/lib/notify';
import { scheduleTaskJobs } from '@/lib/agenda';
import { problem } from '@/lib/http';
import { computeParticipants } from '@/lib/taskParticipants';
import { withOrganization } from '@/lib/middleware/withOrganization';

const stepSchema = z.object({
  title: z.string(),
  ownerId: z.string(),
  description: z.string().optional(),
  dueAt: z.coerce.date().optional(),
  status: z.enum(['OPEN', 'DONE']).optional(),
  completedAt: z.coerce.date().optional(),
});

const createTaskSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  ownerId: z.string().optional(),
  helpers: z.array(z.string()).optional(),
  mentions: z.array(z.string()).optional(),
  teamId: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  tags: z.array(z.string()).optional(),
  visibility: z.enum(['PRIVATE', 'TEAM']).optional(),
  dueDate: z.coerce.date().optional(),
  steps: z.array(stepSchema).optional(),
});

export const POST = withOrganization(async (req, session) => {
  let body: z.infer<typeof createTaskSchema>;
  try {
    body = createTaskSchema.parse(await req.json());
  } catch (e: any) {
    return problem(400, 'Invalid request', e.message);
  }
  const createdBy = session.userId;
  let ownerId = body.ownerId;
  let status: string = 'OPEN';
  let currentStepIndex = 0;
  const steps = body.steps ?? [];
  if (steps.length) {
    ownerId = steps[0].ownerId;
    status = 'FLOW_IN_PROGRESS';
    currentStepIndex = 0;
  }
  if (!ownerId) {
    return problem(400, 'Invalid request', 'ownerId is required');
  }
  await dbConnect();
  // ensure owner is from same organization
  const owner = await User.findOne({
    _id: new Types.ObjectId(ownerId),
    organizationId: new Types.ObjectId(session.organizationId),
  });
  if (!owner) {
    return problem(400, 'Invalid request', 'Owner must be in your organization');
  }
  // ensure each step owner is from same organization
  for (const s of steps) {
    const stepOwner = await User.findOne({
      _id: new Types.ObjectId(s.ownerId),
      organizationId: new Types.ObjectId(session.organizationId),
    });
    if (!stepOwner) {
      return problem(400, 'Invalid request', 'Step owner must be in your organization');
    }
  }
  const task: ITask = await Task.create({
    title: body.title,
    description: body.description,
    createdBy: new Types.ObjectId(createdBy),
    ownerId: new Types.ObjectId(ownerId),
    helpers: body.helpers?.map((id) => new Types.ObjectId(id)),
    mentions: body.mentions?.map((id) => new Types.ObjectId(id)),
    organizationId: new Types.ObjectId(session.organizationId),
    teamId: body.teamId ? new Types.ObjectId(body.teamId) : undefined,
    status,
    priority: body.priority ?? 'MEDIUM',
    tags: body.tags ?? [],
    visibility: body.visibility ?? 'PRIVATE',
    dueDate: body.dueDate,
    steps: steps.map((s) => ({
      title: s.title,
      ownerId: new Types.ObjectId(s.ownerId),
      description: s.description,
      dueAt: s.dueAt,
      status: s.status ?? 'OPEN',
      completedAt: s.completedAt,
    })),
    currentStepIndex,
    participantIds: computeParticipants({
      createdBy,
      ownerId,
      helpers: body.helpers,
      mentions: body.mentions,
      steps,
    }),
  });
  await ActivityLog.create({
    taskId: task._id,
    actorId: new Types.ObjectId(createdBy),
    type: 'CREATED',
    payload: {},
  });
  await scheduleTaskJobs(task);
  const assignmentIds = [
    task.ownerId,
    ...(task.helpers || []),
  ].filter((id) => id.toString() !== createdBy);
  if (assignmentIds.length) {
    await notifyAssignment(assignmentIds as Types.ObjectId[], task);
  }
  const mentionIds = (task.mentions || []).filter(
    (id) => id.toString() !== createdBy
  );
  if (mentionIds.length) {
    await notifyMention(mentionIds as Types.ObjectId[], task._id);
  }
  return NextResponse.json(task, { status: 201 });
});

const listQuerySchema = z.object({
  ownerId: z.string().optional(),
  createdBy: z.string().optional(),
  status: z
    .union([z.string(), z.array(z.string())])
    .transform((val) => (Array.isArray(val) ? val : val ? [val] : []))
    .optional(),
  dueFrom: z.coerce.date().optional(),
  dueTo: z.coerce.date().optional(),
  tag: z
    .union([z.string(), z.array(z.string())])
    .transform((val) => (Array.isArray(val) ? val : val ? [val] : []))
    .optional(),
  visibility: z.enum(['PRIVATE', 'TEAM']).optional(),
  teamId: z.string().optional(),
  q: z.string().optional(),
});

export const GET = withOrganization(async (req, session) => {
  const url = new URL(req.url);
  const raw: Record<string, string | string[]> = {};
  url.searchParams.forEach((value, key) => {
    if (raw[key]) {
      raw[key] = Array.isArray(raw[key])
        ? [...(raw[key] as string[]), value]
        : [raw[key] as string, value];
    } else {
      raw[key] = value;
    }
  });
  let query: z.infer<typeof listQuerySchema>;
  try {
    query = listQuerySchema.parse(raw);
  } catch (e: any) {
    return problem(400, 'Invalid request', e.message);
  }
  await dbConnect();
  const filter: any = { organizationId: new Types.ObjectId(session.organizationId) };
  if (query.ownerId) filter.ownerId = new Types.ObjectId(query.ownerId);
  if (query.createdBy) filter.createdBy = new Types.ObjectId(query.createdBy);
  if (query.status && query.status.length) filter.status = { $in: query.status };
  if (query.dueFrom || query.dueTo) {
    filter.dueDate = {};
    if (query.dueFrom) filter.dueDate.$gte = query.dueFrom;
    if (query.dueTo) filter.dueDate.$lte = query.dueTo;
  }
  if (query.tag && query.tag.length) filter.tags = { $in: query.tag };
  if (query.visibility) filter.visibility = query.visibility;
  if (query.teamId) filter.teamId = new Types.ObjectId(query.teamId);
  if (query.q) filter.$text = { $search: query.q };

  const access: any[] = [
    { participantIds: new Types.ObjectId(session.userId) },
  ];
  if (session.teamId) {
    access.push({ visibility: 'TEAM', teamId: new Types.ObjectId(session.teamId) });
  }
  const tasks = await Task.find({ $and: [filter, { $or: access }] }).sort({ updatedAt: -1 });
  return NextResponse.json(tasks);
});

