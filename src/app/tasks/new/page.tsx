'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { z } from 'zod';

const simpleSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  owner: z.string().min(1, 'Owner is required'),
});

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

export default function NewTaskPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [simple, setSimple] = useState({ title: '', owner: '' });
  const [simpleError, setSimpleError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const res = await fetch('/api/users', { credentials: 'include' });
      if (res.ok) {
        const data = (await res.json()) as User[];
        setUsers(data);
      }
    };
    void load();
  }, []);

  const submitSimple = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = simpleSchema.safeParse(simple);
    if (!res.success) {
      const firstError = res.error.errors[0];
      setSimpleError(firstError ? firstError.message : 'Invalid input');
      return;
    }
    setSimpleError(null);
    try {
      const resp = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title: simple.title, ownerId: simple.owner }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        setSimpleError(err.detail || 'Failed to create task');
        return;
      }
      const task = await resp.json();
      router.push(`/tasks/${task._id}`);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to create task';
        setSimpleError(message);
      }
  };

  const [flowTitle, setFlowTitle] = useState('');
  const [steps, setSteps] = useState<FlowStep[]>([
    { title: '', description: '', ownerId: '', due: '' },
  ]);
  const [flowError, setFlowError] = useState<string | null>(null);

  const addStep = () =>
    setSteps([...steps, { title: '', description: '', ownerId: '', due: '' }]);

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

  const flowContent = (
    <form onSubmit={submitFlow} className="space-y-4">
      <Input
        placeholder="Title"
        value={flowTitle}
        onChange={(e) => setFlowTitle(e.target.value)}
      />
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
        Create Flow
      </Button>
      {flowError && <p className="text-red-600 text-sm">{flowError}</p>}
      <Button type="submit">Create Task</Button>
    </form>
  );

  return (
    <div className="p-4">
      <Tabs defaultValue="simple">
        <TabsList className="mb-4">
          <TabsTrigger value="simple">Simple</TabsTrigger>
          <TabsTrigger value="flow">Flow</TabsTrigger>
        </TabsList>
        <TabsContent value="simple">
          <form onSubmit={submitSimple} className="space-y-2">
            <Input
              placeholder="Title"
              value={simple.title}
              onChange={(e) => setSimple({ ...simple, title: e.target.value })}
            />
            <select
              value={simple.owner}
              onChange={(e) => setSimple({ ...simple, owner: e.target.value })}
              className="flex h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
            >
              <option value="">Owner</option>
              {users.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.name}
                </option>
              ))}
            </select>
            {simpleError && (
              <p className="text-red-600 text-sm">{simpleError}</p>
            )}
            <Button type="submit">Create</Button>
          </form>
        </TabsContent>
        <TabsContent value="flow">{flowContent}</TabsContent>
      </Tabs>
    </div>
  );
}
