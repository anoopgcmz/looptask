'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { SessionProvider } from 'next-auth/react';
import TaskForm from '@/components/task-form';
import useAuth from '@/hooks/useAuth';
import { useToast } from '@/components/ui/toast-provider';
import type { TaskResponse } from '@/types/api/task';

function EditTaskPageInner({ id }: { id: string }) {
  const router = useRouter();
  const { user, status, isLoading } = useAuth();
  const { showToast } = useToast();
  const [task, setTask] = useState<TaskResponse | null>(null);
  const [loadingTask, setLoadingTask] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated' && !isLoading) {
      router.push('/login');
    }
  }, [isLoading, router, status]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    let isMounted = true;
    const load = async () => {
      setLoadingTask(true);
      setLoadError(null);
      try {
        const res = await fetch(`/api/tasks/${id}`, { credentials: 'include' });
        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))) as { detail?: string };
          if (res.status === 404) {
            if (isMounted) setTask(null);
            if (isMounted) setLoadError(err.detail ?? 'Task not found');
            return;
          }
          if (isMounted) setLoadError(err.detail ?? 'Unable to load task');
          return;
        }
        const data = (await res.json()) as TaskResponse;
        if (isMounted) setTask(data);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unable to load task';
        if (isMounted) setLoadError(message);
      } finally {
        if (isMounted) setLoadingTask(false);
      }
    };
    void load();
    return () => {
      isMounted = false;
    };
  }, [id, status]);

  if (status === 'loading' || (status === 'authenticated' && loadingTask && !task && !loadError)) {
    return <div className="p-4">Loading…</div>;
  }

  if (status === 'unauthenticated') {
    return null;
  }

  if (loadError && !task) {
    return <div className="p-4 text-red-600">{loadError}</div>;
  }

  if (!task) {
    return <div className="p-4">Task not found.</div>;
  }

  const currentUserId = user?.userId ?? '';

  return (
    <TaskForm
      currentUserId={currentUserId}
      initialValues={{
        title: task.title,
        description: task.description ?? '',
        priority: task.priority,
        steps:
          task.steps?.map((step) => ({
            title: step.title ?? '',
            description: step.description ?? '',
            ownerId: step.ownerId ?? '',
            dueAt: step.dueAt ?? null,
          })) ?? [],
      }}
      submitLabel="Save Changes"
      submitPendingLabel="Saving…"
      onCancel={() => router.push(`/tasks/${task._id}`)}
      onSubmit={async (values) => {
        if (isRedirecting) return;
        try {
          const resp = await fetch(`/api/tasks/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(values),
          });
          if (!resp.ok) {
            const err = (await resp.json().catch(() => ({}))) as { detail?: string };
            return { error: err.detail ?? 'Failed to update task' };
          }
          const updated = (await resp.json()) as TaskResponse;
          showToast({ message: 'Task updated successfully', tone: 'success', duration: 5000 });
          setIsRedirecting(true);
          router.push(`/tasks/${updated._id}`);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to update task';
          return { error: message };
        }
      }}
    />
  );
}

export default function EditTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <SessionProvider>
      <EditTaskPageInner id={id} />
    </SessionProvider>
  );
}
