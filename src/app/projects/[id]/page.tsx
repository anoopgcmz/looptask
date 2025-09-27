'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { SessionProvider } from 'next-auth/react';
import StatusBadge from '@/components/status-badge';
import { Card } from '@/components/ui/card';
import type { ProjectDetail } from '@/types/api/project';
import type { TaskResponse as Task } from '@/types/api/task';

function ProjectDetailPageInner() {
  const params = useParams<{ id?: string | string[] }>();
  const idParam = params?.id;
  const projectId = Array.isArray(idParam) ? idParam[0] : idParam ?? '';

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tasksError, setTasksError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) {
      return;
    }

    let isMounted = true;

    const loadProject = async () => {
      try {
        setLoading(true);
        setError(null);
        setTasksError(null);
        const [projectResponse, tasksResponse] = await Promise.all([
          fetch(`/api/projects/${projectId}`, { credentials: 'include' }),
          fetch(`/api/tasks?projectId=${projectId}`, { credentials: 'include' }),
        ]);

        if (!projectResponse.ok) {
          const errorBody = (await projectResponse.json().catch(() => ({}))) as { detail?: string };
          throw new Error(errorBody.detail ?? 'Unable to load project');
        }

        const projectData = (await projectResponse.json()) as ProjectDetail;
        if (!isMounted) {
          return;
        }
        setProject(projectData);

        if (tasksResponse.ok) {
          const taskData = (await tasksResponse.json()) as Task[];
          if (isMounted) {
            setTasks(taskData);
          }
        } else if (isMounted) {
          const taskError = (await tasksResponse.json().catch(() => ({}))) as { detail?: string };
          setTasks([]);
          setTasksError(taskError.detail ?? 'Unable to load tasks for this project');
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        const message = err instanceof Error ? err.message : 'Unable to load project';
        setError(message);
        setProject(null);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadProject();

    return () => {
      isMounted = false;
    };
  }, [projectId]);

  const stats = useMemo(() => {
    const pending = project?.stats?.pending ?? tasks.filter((task) => task.status !== 'DONE').length;
    const done = project?.stats?.done ?? tasks.filter((task) => task.status === 'DONE').length;
    const total = project?.stats?.total ?? tasks.length;
    return { pending, done, total };
  }, [project, tasks]);

  if (!projectId) {
    return <div className="p-4 md:p-6">Project not found.</div>;
  }

  if (loading) {
    return <div className="p-4 md:p-6 text-sm text-[var(--color-text-muted)]">Loading project…</div>;
  }

  if (error) {
    return (
      <div className="p-4 md:p-6">
        <Card className="border-[var(--color-status-destructive)]/40 bg-[var(--status-destructive-soft)] text-sm text-[var(--color-status-destructive)]">
          {error}
        </Card>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-4 md:p-6">
        <Card className="text-sm text-[var(--color-text-muted)]">Project unavailable.</Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <Card className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-[var(--tone-text-strong)]">{project.name}</h1>
            {project.type?.name ? (
              <span className="inline-flex w-fit items-center rounded-full bg-[var(--brand-primary)]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--brand-primary)]">
                {project.type.name}
              </span>
            ) : null}
            {project.description ? (
              <p className="max-w-2xl text-sm text-[var(--color-text-muted)]">{project.description}</p>
            ) : (
              <p className="text-sm text-[var(--color-text-muted)]">No description provided yet.</p>
            )}
          </div>
          <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-3">
            <div className="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Pending</p>
              <p className="mt-1 text-xl font-semibold text-[var(--tone-text-strong)]">{stats.pending}</p>
            </div>
            <div className="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Done</p>
              <p className="mt-1 text-xl font-semibold text-[var(--tone-text-strong)]">{stats.done}</p>
            </div>
            <div className="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Total</p>
              <p className="mt-1 text-xl font-semibold text-[var(--tone-text-strong)]">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-6 text-xs text-[var(--color-text-muted)]">
          <div>
            <p className="font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Created</p>
            <p className="mt-1 text-sm text-[var(--tone-text-strong)]">
              {project.createdAt ? new Date(project.createdAt).toLocaleString() : '—'}
            </p>
          </div>
          <div>
            <p className="font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Updated</p>
            <p className="mt-1 text-sm text-[var(--tone-text-strong)]">
              {project.updatedAt ? new Date(project.updatedAt).toLocaleString() : '—'}
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[var(--tone-text-strong)]">Project tasks</h2>
            <p className="text-sm text-[var(--color-text-muted)]">
              {tasks.length > 0 ? `${tasks.length} task${tasks.length === 1 ? '' : 's'}` : 'No tasks assigned yet.'}
            </p>
          </div>
          <Link
            href={`/tasks/new?projectId=${project._id}`}
            className="inline-flex items-center justify-center rounded-[10px] border border-[var(--brand-primary)] px-3 py-1.5 text-sm font-semibold text-[var(--brand-primary)] transition hover:bg-[var(--brand-primary)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-offset-2"
          >
            New Task
          </Link>
        </div>
        {tasksError ? (
          <p className="mt-4 rounded-[12px] border border-[var(--color-status-destructive)]/40 bg-[var(--status-destructive-soft)] p-3 text-sm text-[var(--color-status-destructive)]">
            {tasksError}
          </p>
        ) : null}
        <div className="mt-6 divide-y divide-[var(--color-border)]">
          {tasks.length === 0 ? (
            <div className="py-6 text-sm text-[var(--color-text-muted)]">
              No tasks yet. Create one to get this project moving.
            </div>
          ) : (
            tasks.map((task) => (
              <Link
                key={task._id}
                href={`/tasks/${task._id}`}
                className="flex flex-col gap-3 py-4 transition hover:text-[var(--brand-primary)] sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-[var(--tone-text-strong)]">{task.title}</p>
                  {task.description ? (
                    <p className="mt-1 line-clamp-2 text-sm text-[var(--color-text-muted)]">{task.description}</p>
                  ) : null}
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={task.status} size="sm" />
                  {task.dueDate ? (
                    <span className="text-xs font-medium text-[var(--color-text-muted)]">
                      Due {new Date(task.dueDate).toLocaleDateString()}
                    </span>
                  ) : null}
                </div>
              </Link>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}

export default function ProjectDetailPage() {
  return (
    <SessionProvider>
      <ProjectDetailPageInner />
    </SessionProvider>
  );
}
