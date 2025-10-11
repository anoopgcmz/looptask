'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { SessionProvider } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import useAuth from '@/hooks/useAuth';
import { useToast } from '@/components/ui/toast-provider';
import TaskForm, { type TaskFormSubmitValues, type TaskFormValues } from '@/components/task-form';
import type { ProjectSummary } from '@/types/api/project';
import type { TaskPayload } from '@/types/api/task';

interface MatchedEntity {
  matched: boolean;
  resolved: string;
  provided?: string;
}

interface DraftConfidence {
  project: MatchedEntity;
  owner: MatchedEntity;
  steps: Array<{
    owner: MatchedEntity;
    dueDateValid: boolean;
  }>;
  warnings: string[];
}

interface DraftResponseItem {
  id: string;
  payload: TaskPayload;
  confidence: DraftConfidence;
}

type DraftStatus = 'ready' | 'submitting' | 'submitted' | 'error' | 'regenerating';

interface DraftState extends DraftResponseItem {
  status: DraftStatus;
  error: string;
  sourcePrompt: string;
  originalPayload: TaskPayload;
}

const toIsoDate = (value?: string | Date | null) => {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

const payloadToInitialValues = (payload: TaskPayload): Partial<TaskFormValues> => ({
  title: payload.title,
  description: payload.description ?? '',
  priority: (payload.priority ?? 'LOW') as TaskFormValues['priority'],
  projectId: payload.projectId,
  steps:
    payload.steps?.map((step) => ({
      title: step.title,
      description: step.description ?? '',
      ownerId: step.ownerId,
      dueAt: toIsoDate(
        typeof step.dueAt === 'string' || step.dueAt instanceof Date
          ? step.dueAt
          : undefined,
      ),
    })) ?? [],
});

const payloadToSubmitValues = (payload: TaskPayload): TaskFormSubmitValues => ({
  title: payload.title,
  description: payload.description ?? '',
  priority: (payload.priority ?? 'LOW') as TaskFormSubmitValues['priority'],
  projectId: payload.projectId,
  steps:
    payload.steps?.map((step) => ({
      title: step.title,
      description: step.description ?? '',
      ownerId: step.ownerId,
      dueAt: step.dueAt ? new Date(step.dueAt).toISOString() : undefined,
    })) ?? [],
});

const submitValuesToPayload = (
  values: TaskFormSubmitValues,
  ownerId?: string,
): TaskPayload => ({
  title: values.title,
  description: values.description,
  projectId: values.projectId,
  priority: values.priority,
  ownerId,
  steps: values.steps.map((step) => ({
    title: step.title,
    description: step.description,
    ownerId: step.ownerId,
    dueAt: step.dueAt ? new Date(step.dueAt) : undefined,
  })),
});

const sameSubmission = (a: TaskFormSubmitValues, b: TaskFormSubmitValues) =>
  JSON.stringify(a) === JSON.stringify(b);

function DraftCard({
  draft,
  projects,
  projectsLoading,
  onProjectsRefresh,
  onDelete,
  onRegenerate,
  onSubmit,
  currentUserId,
}: {
  draft: DraftState;
  projects: ProjectSummary[];
  projectsLoading: boolean;
  onProjectsRefresh: () => Promise<void>;
  onDelete: (id: string) => void;
  onRegenerate: (id: string) => Promise<void>;
  onSubmit: (id: string, values: TaskFormSubmitValues) => Promise<{ error?: string } | void>;
  currentUserId: string;
}) {
  const warningSet = new Set(draft.confidence.warnings);
  const hasWarnings = warningSet.size > 0;

  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm">
      <div className="flex flex-col gap-2 border-b border-[#E5E7EB] bg-[#F9FAFB] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-[#111827]">Draft Preview</h2>
          <div className="flex flex-wrap items-center gap-2 text-sm text-[#4B5563]">
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                draft.status === 'submitted'
                  ? 'bg-green-100 text-green-800'
                  : draft.status === 'submitting' || draft.status === 'regenerating'
                    ? 'bg-indigo-100 text-indigo-700'
                    : draft.status === 'error'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-gray-100 text-gray-700'
              }`}
            >
              {draft.status === 'submitting'
                ? 'Submitting…'
                : draft.status === 'regenerating'
                  ? 'Regenerating…'
                  : draft.status === 'submitted'
                    ? 'Submitted'
                    : draft.status === 'error'
                      ? 'Needs attention'
                      : 'Ready for review'}
            </span>
            {hasWarnings ? (
              <span className="inline-flex items-center rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-yellow-800">
                Review suggested
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void onRegenerate(draft.id)}
            disabled={draft.status === 'submitting' || draft.status === 'regenerating'}
            className="rounded-lg border border-indigo-200 px-4 py-2 text-sm font-semibold text-indigo-600 transition hover:border-indigo-300 hover:bg-indigo-50"
          >
            Regenerate
          </button>
          <button
            type="button"
            onClick={() => onDelete(draft.id)}
            className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition hover:border-red-300 hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </div>
      {hasWarnings ? (
        <div className="border-b border-[#E5E7EB] bg-yellow-50 px-6 py-3 text-sm text-yellow-800">
          <p className="font-semibold">Check these before approving:</p>
          <ul className="list-disc pl-5">
            {Array.from(warningSet).map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {draft.error ? (
        <div className="border-b border-[#E5E7EB] bg-red-50 px-6 py-3 text-sm text-red-700">
          {draft.error}
        </div>
      ) : null}
      <TaskForm
        currentUserId={currentUserId}
        initialValues={payloadToInitialValues(draft.payload)}
        projects={projects}
        projectsLoading={projectsLoading}
        onProjectsRefresh={onProjectsRefresh}
        onSubmit={async (values) => onSubmit(draft.id, values)}
        submitLabel="Approve Draft"
        submitPendingLabel="Submitting…"
        embedded
      />
    </div>
  );
}

function TaskIntakePageInner() {
  const router = useRouter();
  const { showToast } = useToast();
  const { user, status, isLoading } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [drafts, setDrafts] = useState<DraftState[]>([]);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadProjects = useCallback(async () => {
    if (!isMountedRef.current) return;
    setProjectsLoading(true);
    try {
      const response = await fetch('/api/projects?limit=200', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to load projects');
      const data = (await response.json()) as ProjectSummary[];
      if (!isMountedRef.current) return;
      setProjects(data);
    } catch {
      if (!isMountedRef.current) return;
      setProjects([]);
    } finally {
      if (!isMountedRef.current) return;
      setProjectsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (status === 'unauthenticated' && !isLoading) {
      router.push('/login');
    }
  }, [isLoading, router, status]);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      showToast({ message: 'Describe the work you need so we can draft tasks.', tone: 'info' });
      return;
    }
    setIsGenerating(true);
    try {
      const response = await fetch('/api/ai/task-intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ prompt, options: { draftCount: 3 } }),
      });
      if (!response.ok) {
        const error = (await response.json().catch(() => ({}))) as { detail?: string };
        showToast({ message: error.detail ?? 'Failed to generate drafts', tone: 'error' });
        return;
      }
      const data = (await response.json()) as { drafts: DraftResponseItem[] };
      if (!Array.isArray(data.drafts) || data.drafts.length === 0) {
        showToast({ message: 'No drafts returned. Try refining your prompt.', tone: 'warning' });
        return;
      }
      setDrafts((prev) => [
        ...prev,
        ...data.drafts.map((item) => ({
          ...item,
          status: 'ready' as DraftStatus,
          sourcePrompt: prompt,
          originalPayload: item.payload,
          error: '',
        })),
      ]);
      showToast({ message: 'Drafts ready for review', tone: 'success' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to generate drafts';
      showToast({ message, tone: 'error' });
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, showToast]);

  const handleDelete = useCallback((id: string) => {
    setDrafts((prev) => prev.filter((draft) => draft.id !== id));
  }, []);

  const handleRegenerate = useCallback(
    async (id: string) => {
      setDrafts((prev) =>
        prev.map((draft) =>
          draft.id === id
            ? {
                ...draft,
                status: 'regenerating' as DraftStatus,
                error: '',
              }
            : draft,
        ),
      );
      const target = drafts.find((draft) => draft.id === id);
      if (!target) {
        return;
      }
      try {
        const response = await fetch('/api/ai/task-intake', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            prompt: target.sourcePrompt,
            projectHints: projects
              .filter((project) => project._id === target.payload.projectId)
              .map((project) => project.name),
            options: { draftCount: 1 },
          }),
        });
        if (!response.ok) {
          const error = (await response.json().catch(() => ({}))) as { detail?: string };
          throw new Error(error.detail ?? 'Unable to regenerate draft');
        }
        const data = (await response.json()) as { drafts: DraftResponseItem[] };
        const nextDraft = data.drafts?.[0];
        if (!nextDraft) {
          throw new Error('No draft returned from regeneration');
        }
        setDrafts((prev) =>
          prev.map((draft) =>
            draft.id === id
              ? {
                  ...nextDraft,
                  status: 'ready',
                  sourcePrompt: draft.sourcePrompt,
                  originalPayload: nextDraft.payload,
                  error: '',
                }
              : draft,
          ),
        );
        showToast({ message: 'Draft updated', tone: 'success' });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to regenerate draft';
        setDrafts((prev) =>
          prev.map((draft) =>
            draft.id === id
              ? {
                  ...draft,
                  status: 'error',
                  error: message,
                }
              : draft,
          ),
        );
        showToast({ message, tone: 'error' });
      }
    },
    [drafts, projects, showToast],
  );

  const handleSubmit = useCallback(
    async (id: string, values: TaskFormSubmitValues) => {
      const draft = drafts.find((item) => item.id === id);
      if (!draft) return { error: 'Draft not found' };

      const baseline = payloadToSubmitValues(draft.originalPayload);
      const edited = !sameSubmission(baseline, values);

      setDrafts((prev) =>
        prev.map((item) =>
          item.id === id
              ? {
                  ...item,
                  status: 'submitting',
                  error: '',
                  payload: submitValuesToPayload(values, item.payload.ownerId),
                }
            : item,
        ),
      );

      try {
        const response = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(values),
        });
        if (!response.ok) {
          const error = (await response.json().catch(() => ({}))) as { detail?: string };
          const message = error.detail ?? 'Failed to submit draft';
          setDrafts((prev) =>
            prev.map((item) =>
              item.id === id
                ? {
                    ...item,
                    status: 'error',
                    error: message,
                  }
                : item,
            ),
          );
          void fetch('/api/ai/task-intake/analytics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ draftId: id, edited, success: false }),
          }).catch(() => undefined);
          return { error: message };
        }
        setDrafts((prev) =>
          prev.map((item) =>
            item.id === id
              ? {
                  ...item,
                  status: 'submitted',
                  error: '',
                  originalPayload: submitValuesToPayload(values, item.payload.ownerId),
                }
              : item,
          ),
        );
        showToast({ message: 'Task created from draft', tone: 'success', duration: 5000 });
        void fetch('/api/ai/task-intake/analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            draftId: id,
            edited,
          }),
        }).catch(() => undefined);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to submit draft';
        setDrafts((prev) =>
          prev.map((item) =>
            item.id === id
              ? {
                  ...item,
                  status: 'error',
                  error: message,
                }
              : item,
          ),
        );
        void fetch('/api/ai/task-intake/analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ draftId: id, edited, success: false }),
        }).catch(() => undefined);
        return { error: message };
      }
      return undefined;
    },
    [drafts, showToast],
  );

  if (status === 'loading') {
    return <div className="p-4">Loading…</div>;
  }

  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <div className="space-y-8 p-6">
      <section className="rounded-2xl border border-dashed border-indigo-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-[#111827]">AI Task Intake</h1>
        <p className="mt-2 text-sm text-[#4B5563]">
          Describe the work you need and we will draft ready-to-edit tasks using your existing project and team context.
        </p>
        <div className="mt-4 space-y-4">
          <textarea
            className="w-full rounded-lg border border-[#E5E7EB] p-4 text-sm text-[#111827] shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            rows={4}
            placeholder="Example: Help the onboarding project move faster by adding a kickoff, environment setup, and QA steps for Alex."
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-[#6B7280]">
              Drafts reuse the standard task form so you can make edits before approval.
            </p>
            <button
              type="button"
              onClick={() => void handleGenerate()}
              disabled={isGenerating}
              className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300"
            >
              {isGenerating ? 'Generating…' : 'Generate drafts'}
            </button>
          </div>
        </div>
      </section>

      {drafts.length > 0 ? (
        <section className="space-y-6">
          {drafts.map((draft) => (
            <DraftCard
              key={draft.id}
              draft={draft}
              projects={projects}
              projectsLoading={projectsLoading}
              onProjectsRefresh={loadProjects}
              onDelete={handleDelete}
              onRegenerate={handleRegenerate}
              onSubmit={handleSubmit}
              currentUserId={user?.userId ?? ''}
            />
          ))}
        </section>
      ) : (
        <section className="rounded-xl border border-[#E5E7EB] bg-white p-6 text-center text-sm text-[#6B7280] shadow-sm">
          Drafted tasks will appear here after you request them.
        </section>
      )}
    </div>
  );
}

export default function TaskIntakePage() {
  return (
    <SessionProvider>
      <TaskIntakePageInner />
    </SessionProvider>
  );
}

