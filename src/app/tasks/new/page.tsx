'use client';
import { useState, useEffect, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { SessionProvider } from 'next-auth/react';
import useAuth from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/toast-provider';
import { DndContext, type DragEndEvent, closestCenter } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface User {
  _id: string;
  name: string;
}

interface FlowStep {
  id: string;
  title: string;
  description: string;
  ownerId: string;
  due: string;
}

const generateStepId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 10);
};

const createStep = (ownerId: string): FlowStep => ({
  id: generateStepId(),
  title: '',
  description: '',
  ownerId,
  due: '',
});

const PRIORITY_OPTIONS: Array<{
  value: 'LOW' | 'MEDIUM' | 'HIGH';
  label: string;
  color: string;
}> = [
  { value: 'LOW', label: 'Low Priority', color: '#6B7280' },
  { value: 'MEDIUM', label: 'Medium Priority', color: '#F59E0B' },
  { value: 'HIGH', label: 'High Priority', color: '#EF4444' },
];

function NewTaskPageInner() {
  const router = useRouter();
  const { user, status, isLoading } = useAuth();
  const { showToast } = useToast();
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
  const [steps, setSteps] = useState<FlowStep[]>([createStep(currentUserId)]);
  const [flowError, setFlowError] = useState<string | null>(null);

  const selectedPriority = PRIORITY_OPTIONS.find((option) => option.value === priority);

  useEffect(() => {
    if (!currentUserId) return;
    setSteps((prev) =>
      prev.map((step) => (step.ownerId ? step : { ...step, ownerId: currentUserId })),
    );
  }, [currentUserId]);

  const addStep = () => setSteps((prev) => [...prev, createStep(currentUserId)]);

  const handleCancel = () => {
    router.push('/tasks');
  };

  const updateStep = (
    id: string,
    key: 'title' | 'description' | 'ownerId' | 'due',
    value: string,
  ) => {
    setSteps((prev) =>
      prev.map((s: FlowStep) => (s.id === id ? { ...s, [key]: value } : s)),
    );
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    setSteps((prev) => {
      const oldIndex = prev.findIndex((step) => step.id === active.id);
      const newIndex = prev.findIndex((step) => step.id === over.id);
      if (oldIndex === -1 || newIndex === -1) {
        return prev;
      }
      return arrayMove(prev, oldIndex, newIndex);
    });
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
      showToast({ message: 'Task created successfully', tone: 'success', duration: 5000 });
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
              <div className="relative">
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full"
                  style={{ backgroundColor: selectedPriority?.color ?? '#6B7280' }}
                />
                <Select
                  id="priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as 'LOW' | 'MEDIUM' | 'HIGH')}
                  className="flex h-10 w-full appearance-none rounded-lg border border-[#E5E7EB] bg-white pl-9 pr-10 text-sm transition-shadow focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:ring-offset-0 hover:border-indigo-300 hover:shadow-sm"
                  style={{ color: selectedPriority?.color ?? '#6B7280' }}
                >
                  {PRIORITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value} style={{ color: option.color }}>
                      ● {option.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>
        </Card>

        <Card className="space-y-5">
          <h2 className="text-lg font-semibold text-[#111827]">Steps</h2>
          <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={steps.map((step) => step.id)}>
              {steps.map((step, index) => (
                <StepCard
                  key={step.id}
                  step={step}
                  index={index}
                  users={users}
                  onUpdate={updateStep}
                  showDivider={index > 0}
                />
              ))}
            </SortableContext>
          </DndContext>
        </Card>

        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={addStep}
            className="border-indigo-200 text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
          >
            Add Step
          </Button>
        </div>

        {flowError && <p className="text-sm text-red-600">{flowError}</p>}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            className="border-[#E5E7EB] text-[#4B5563] hover:border-[#D1D5DB] hover:bg-[#F3F4F6] hover:text-[#1F2937]"
          >
            Cancel
          </Button>
          <Button type="submit">Create Task</Button>
        </div>
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

function StepCard({
  step,
  index,
  users,
  onUpdate,
  showDivider,
}: {
  step: FlowStep;
  index: number;
  users: User[];
  onUpdate: (id: string, key: 'title' | 'description' | 'ownerId' | 'due', value: string) => void;
  showDivider: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: step.id,
  });

  const style: CSSProperties = {
    transform: transform ? CSS.Transform.toString(transform) : undefined,
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(showDivider && 'mt-4 border-t border-[#E5E7EB] pt-4', 'relative')}
    >
      <div
        className={cn(
          'flex gap-4 rounded-[12px] border border-[#E5E7EB] bg-white p-6 shadow-sm transition-shadow',
          isDragging && 'shadow-md ring-2 ring-indigo-200 ring-offset-2',
        )}
      >
        <button
          type="button"
          aria-label={`Reorder step ${index + 1}`}
          {...attributes}
          {...listeners}
          className={cn(
            'flex h-10 w-10 shrink-0 cursor-grab items-center justify-center rounded-md text-[#9CA3AF] transition-colors hover:text-[#4B5563] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200 focus-visible:ring-offset-2',
            isDragging && 'cursor-grabbing',
          )}
        >
          <GripIcon className="h-5 w-5" />
          <span className="sr-only">Drag handle</span>
        </button>
        <div className="flex-1 space-y-4">
          <div className="space-y-2">
            <label
              className="block text-sm font-medium text-[#4B5563]"
              htmlFor={`step-title-${step.id}`}
            >
              Step Name
            </label>
            <Input
              id={`step-title-${step.id}`}
              placeholder="Enter step name"
              value={step.title}
              onChange={(e) => onUpdate(step.id, 'title', e.target.value)}
              className="border-[#E5E7EB] placeholder:text-[#9CA3AF] hover:border-indigo-300 hover:shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:ring-offset-0"
            />
          </div>
          <div className="space-y-2">
            <label
              className="block text-sm font-medium text-[#4B5563]"
              htmlFor={`step-description-${step.id}`}
            >
              Description
            </label>
            <Textarea
              id={`step-description-${step.id}`}
              placeholder="Describe the work to be completed"
              value={step.description}
              onChange={(e) => onUpdate(step.id, 'description', e.target.value)}
              className="min-h-[120px] border-[#E5E7EB] placeholder:text-[#9CA3AF] hover:border-indigo-300 hover:shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:ring-offset-0"
            />
          </div>
          <div className="space-y-2">
            <label
              className="block text-sm font-medium text-[#4B5563]"
              htmlFor={`step-owner-${step.id}`}
            >
              Assignee
            </label>
            <select
              id={`step-owner-${step.id}`}
              value={step.ownerId}
              onChange={(e) => onUpdate(step.id, 'ownerId', e.target.value)}
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
            <label className="block text-sm font-medium text-[#4B5563]" htmlFor={`step-due-${step.id}`}>
              Due Date
            </label>
            <Input
              id={`step-due-${step.id}`}
              type="date"
              value={step.due}
              onChange={(e) => onUpdate(step.id, 'due', e.target.value)}
              className="border-[#E5E7EB] placeholder:text-[#9CA3AF] hover:border-indigo-300 hover:shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:ring-offset-0"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function GripIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="6" cy="5" r="1.2" />
      <circle cx="6" cy="10" r="1.2" />
      <circle cx="6" cy="15" r="1.2" />
      <circle cx="14" cy="5" r="1.2" />
      <circle cx="14" cy="10" r="1.2" />
      <circle cx="14" cy="15" r="1.2" />
    </svg>
  );
}
