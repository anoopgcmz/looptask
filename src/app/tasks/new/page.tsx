'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SessionProvider } from 'next-auth/react';
import useAuth from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

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
        const err = (await resp.json().catch(() => ({}))) as { detail?: string };
        setFlowError(err.detail ?? 'Failed to create task');
        return;
      }
      const task = (await resp.json()) as { _id?: string };
      if (typeof task._id === 'string') {
        router.push(`/tasks/${task._id}`);
      } else {
        router.push('/tasks');
      }
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
    <div className="min-h-screen bg-[#F9FAFB] px-8 py-6">
      <form onSubmit={submitFlow} className="mx-auto max-w-3xl space-y-6">
        <Card className="space-y-5">
          <h2 className="text-lg font-semibold text-[#111827]">Task Info</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[#4B5563]" htmlFor="flow-title">
                Title
              </label>
              <Input
                id="flow-title"
                placeholder="Enter task title"
                value={flowTitle}
                onChange={(e) => setFlowTitle(e.target.value)}
                className="border-[#E5E7EB] placeholder:text-[#9CA3AF] hover:border-indigo-300 hover:shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:ring-offset-0"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[#4B5563]" htmlFor="priority">
                Priority
              </label>
              <select
                id="priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as 'LOW' | 'MEDIUM' | 'HIGH')}
                className="flex h-10 w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#111827] transition-shadow focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:ring-offset-0 hover:border-indigo-300 hover:shadow-sm"
              >
                <option value="LOW">Low Priority</option>
                <option value="MEDIUM">Medium Priority</option>
                <option value="HIGH">High Priority</option>
              </select>
            </div>
          </div>
        </Card>

        <Card className="space-y-5">
          <h2 className="text-lg font-semibold text-[#111827]">Steps</h2>
          <div className="space-y-6">
            {steps.map((step, i) => (
              <div key={i} className="space-y-4 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                <div className="space-y-2">
                  <label
                    className="block text-sm font-medium text-[#4B5563]"
                    htmlFor={`step-title-${i}`}
                  >
                    Step Name
                  </label>
                  <Input
                    id={`step-title-${i}`}
                    placeholder="Enter step name"
                    value={step.title}
                    onChange={(e) => updateStep(i, 'title', e.target.value)}
                    className="border-[#E5E7EB] placeholder:text-[#9CA3AF] hover:border-indigo-300 hover:shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:ring-offset-0"
                  />
                </div>
                <div className="space-y-2">
                  <label
                    className="block text-sm font-medium text-[#4B5563]"
                    htmlFor={`step-description-${i}`}
                  >
                    Description
                  </label>
                  <Textarea
                    id={`step-description-${i}`}
                    placeholder="Describe the work to be completed"
                    value={step.description}
                    onChange={(e) => updateStep(i, 'description', e.target.value)}
                    className="min-h-[120px] border-[#E5E7EB] placeholder:text-[#9CA3AF] hover:border-indigo-300 hover:shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:ring-offset-0"
                  />
                </div>
                <div className="space-y-2">
                  <label
                    className="block text-sm font-medium text-[#4B5563]"
                    htmlFor={`step-owner-${i}`}
                  >
                    Assignee
                  </label>
                  <select
                    id={`step-owner-${i}`}
                    value={step.ownerId}
                    onChange={(e) => updateStep(i, 'ownerId', e.target.value)}
                    className="flex h-10 w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#111827] transition-shadow focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:ring-offset-0 hover:border-indigo-300 hover:shadow-sm"
                  >
                    <option value="">Select assignee</option>
                    {users.map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-[#4B5563]" htmlFor={`step-due-${i}`}>
                    Due Date
                  </label>
                  <Input
                    id={`step-due-${i}`}
                    type="date"
                    value={step.due}
                    onChange={(e) => updateStep(i, 'due', e.target.value)}
                    className="border-[#E5E7EB] placeholder:text-[#9CA3AF] hover:border-indigo-300 hover:shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:ring-offset-0"
                  />
                </div>
              </div>
            ))}
          </div>
          <Button type="button" variant="outline" onClick={addStep}>
            Add Step
          </Button>
        </Card>

        {flowError && <p className="text-sm text-red-600">{flowError}</p>}
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
