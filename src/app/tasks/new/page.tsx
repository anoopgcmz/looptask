'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SessionProvider } from 'next-auth/react';
import useAuth from '@/hooks/useAuth';
import { useToast } from '@/components/ui/toast-provider';
import TaskForm from '@/components/task-form';

function NewTaskPageInner() {
  const router = useRouter();
  const { user, status, isLoading } = useAuth();
  const { showToast } = useToast();
  const [isRedirecting, setIsRedirecting] = useState(false);

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

  return (
    <TaskForm
      currentUserId={currentUserId}
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
