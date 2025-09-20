'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SessionProvider } from 'next-auth/react';
import useAuth from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface User {
  _id: string;
  name: string;
}

interface FlowStep {
  title: string;
  description: string;
  ownerId: string;
  due: string;
}

function NewTaskPageInner() {
  const router = useRouter();
  const { user, status, isLoading } = useAuth();
  const currentUserId = user?.userId ?? '';
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    if (status === 'unauthenticated' && !isLoading) {
      router.push('/login');
    }
  }, [isLoading, router, status]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    const load = async () => {
      const res = await fetch('/api/users', { credentials: 'include' });
      if (res.ok) {
        const data = (await res.json()) as User[];
        setUsers(data);
      }
    };
    void load();
  }, [status]);

  const [flowTitle, setFlowTitle] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('LOW');
  const [steps, setSteps] = useState<FlowStep[]>([
    { title: '', description: '', ownerId: currentUserId, due: '' },
  ]);
  const [flowError, setFlowError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUserId) return;
    setSteps((prev) =>
      prev.map((step) => (step.ownerId ? step : { ...step, ownerId: currentUserId })),
    );
  }, [currentUserId]);

  const addStep = () =>
    setSteps((prev) => [
      ...prev,
      { title: '', description: '', ownerId: currentUserId, due: '' },
    ]);

  const updateStep = (
    index: number,
    key: 'title' | 'description' | 'ownerId' | 'due',
    value: string,
  ) => {
    setSteps((prev) =>
      prev.map((s: FlowStep, i) => (i === index ? { ...s, [key]: value } : s)),
    );
  };

  const submitFlow = async (e: React.FormEvent) => {
    e.preventDefault();
    setFlowError(null);
    try {
      const body = {
        title: flowTitle,
        priority,
        steps: steps.map((s: FlowStep) => ({
          title: s.title,
          description: s.description,
          ownerId: s.ownerId,
          dueAt: s.due || undefined,
        })),
      };
      const resp = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        setFlowError(err.detail || 'Failed to create task');
        return;
      }
      const task = await resp.json();
      router.push(`/tasks/${task._id}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create task';
      setFlowError(message);
    }
  };

  if (status === 'loading') {
    return <div className="p-4">Loading…</div>;
  }

  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <div className="p-4">
      <form onSubmit={submitFlow} className="space-y-4">
        <Input
          placeholder="Title"
          value={flowTitle}
          onChange={(e) => setFlowTitle(e.target.value)}
        />
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as 'LOW' | 'MEDIUM' | 'HIGH')}
          className="flex h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
        >
          <option value="LOW">Low Priority</option>
          <option value="MEDIUM">Medium Priority</option>
          <option value="HIGH">High Priority</option>
        </select>
        {steps.map((step, i) => (
          <div key={i} className="border p-4 rounded space-y-2">
            <Input
              placeholder="Task Name"
              value={step.title}
              onChange={(e) => updateStep(i, 'title', e.target.value)}
            />
            <Textarea
              placeholder="Description"
              value={step.description}
              onChange={(e) => updateStep(i, 'description', e.target.value)}
            />
            <select
              value={step.ownerId}
              onChange={(e) => updateStep(i, 'ownerId', e.target.value)}
              className="flex h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
            >
              <option value="">Assignee</option>
              {users.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.name}
                </option>
              ))}
            </select>
            <Input
              type="date"
              value={step.due}
              onChange={(e) => updateStep(i, 'due', e.target.value)}
            />
          </div>
        ))}
        <Button type="button" onClick={addStep}>
          Add Step
        </Button>
        {flowError && <p className="text-red-600 text-sm">{flowError}</p>}
        <Button type="submit">Create Task</Button>
      </form>
    </div>
  );
}

export default function NewTaskPage() {
  return (
    <SessionProvider>
      <NewTaskPageInner />
    </SessionProvider>
  );
}
