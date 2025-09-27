'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SessionProvider } from 'next-auth/react';
import useAuth from '@/hooks/useAuth';
import { useToast } from '@/components/ui/toast-provider';
import TaskForm from '@/components/task-form';
import type { ProjectSummary } from '@/types/api/project';

function NewTaskPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, status, isLoading } = useAuth();
  const { showToast } = useToast();
  const [isRedirecting, setIsRedirecting] = useState(false);
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
      if (!response.ok) {
        throw new Error('Failed to load projects');
      }
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

  if (status === 'loading') {
    return <div className="p-4">Loading…</div>;
  }

  if (status === 'unauthenticated') {
    return null;
  }

  const currentUserId = user?.userId ?? '';
  const preselectedProjectId = searchParams?.get('projectId') ?? undefined;
  const isProjectLocked = Boolean(preselectedProjectId);

  return (
    <TaskForm
      currentUserId={currentUserId}
      initialValues={
        preselectedProjectId ? { projectId: preselectedProjectId } : undefined
      }
      projects={projects}
      projectsLoading={projectsLoading}
      projectSelectDisabled={isProjectLocked}
      onProjectsRefresh={loadProjects}
      submitLabel="Create Task"
      submitPendingLabel="Creating…"
      onCancel={() => router.push('/tasks')}
      onSubmit={async (values) => {
        if (isRedirecting) return;
        try {
          const resp = await fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(values),
          });
          if (!resp.ok) {
            const err = (await resp.json().catch(() => ({}))) as { detail?: string };
            return { error: err.detail ?? 'Failed to create task' };
          }
          const task = (await resp.json()) as { _id?: string };
          showToast({ message: 'Task created successfully', tone: 'success', duration: 5000 });
          setIsRedirecting(true);
          if (typeof task._id === 'string') {
            router.push(`/tasks/${task._id}`);
          } else {
            router.push('/tasks');
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to create task';
          return { error: message };
        }
      }}
    />
  );
}

export default function NewTaskPage() {
  return (
    <SessionProvider>
      <NewTaskPageInner />
    </SessionProvider>
  );
}
