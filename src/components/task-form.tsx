'use client';

import { useState, useEffect, type CSSProperties } from 'react';
import { DndContext, type DragEndEvent, closestCenter } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface TaskFormUser {
  _id: string;
  name: string;
  role?: string;
}

export interface TaskFormStepInput {
  title: string;
  description: string;
  ownerId: string;
  dueAt?: string | null;
}

export interface TaskFormValues {
  title: string;
  description?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  steps: TaskFormStepInput[];
}

export interface TaskFormSubmitValues {
  title: string;
  description?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  steps: Array<{
    title: string;
    description: string;
    ownerId: string;
    dueAt?: string;
  }>;
}

export interface TaskFormProps {
  currentUserId: string;
  initialValues?: Partial<TaskFormValues>;
  onSubmit: (values: TaskFormSubmitValues) => Promise<void | { error?: string }>;
  onCancel?: () => void;
  submitLabel?: string;
  submitPendingLabel?: string;
}

interface InternalStep {
  id: string;
  title: string;
  description: string;
  ownerId: string;
  due: string;
}

const PRIORITY_OPTIONS: Array<{
  value: 'LOW' | 'MEDIUM' | 'HIGH';
  label: string;
  color: string;
}> = [
  { value: 'LOW', label: 'Low Priority', color: '#6B7280' },
  { value: 'MEDIUM', label: 'Medium Priority', color: '#F59E0B' },
  { value: 'HIGH', label: 'High Priority', color: '#EF4444' },
];

const generateStepId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 10);
};

const toDateInputValue = (dueAt?: string | null) => {
  if (!dueAt) return '';
  try {
    const date = new Date(dueAt);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 10);
  } catch {
    return '';
  }
};

const mapInitialSteps = (steps: TaskFormStepInput[] | undefined, fallbackOwnerId: string): InternalStep[] => {
  if (!steps?.length) {
    return [
      {
        id: generateStepId(),
        title: '',
        description: '',
        ownerId: fallbackOwnerId,
        due: '',
      },
    ];
  }

  return steps.map((step) => ({
    id: generateStepId(),
    title: step.title ?? '',
    description: step.description ?? '',
    ownerId: step.ownerId ?? fallbackOwnerId,
    due: toDateInputValue(step.dueAt),
  }));
};

export default function TaskForm({
  currentUserId,
  initialValues,
  onSubmit,
  onCancel,
  submitLabel = 'Save Task',
  submitPendingLabel,
}: TaskFormProps) {
  const [users, setUsers] = useState<TaskFormUser[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [flowTitle, setFlowTitle] = useState(initialValues?.title ?? '');
  const [description, setDescription] = useState(initialValues?.description ?? '');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>(
    initialValues?.priority ?? 'LOW',
  );
  const [steps, setSteps] = useState<InternalStep[]>(() =>
    mapInitialSteps(initialValues?.steps, currentUserId),
  );
  const [flowError, setFlowError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const res = await fetch('/api/users', { credentials: 'include' });
        if (!res.ok) return;
        const data = (await res.json()) as TaskFormUser[];
        if (isMounted) setUsers(data.filter((user) => user.role !== 'ADMIN'));
      } catch {
        // swallow fetch errors; list will remain empty
      }
    };
    void load();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setFlowTitle(initialValues?.title ?? '');
  }, [initialValues?.title]);

  useEffect(() => {
    setDescription(initialValues?.description ?? '');
  }, [initialValues?.description]);

  useEffect(() => {
    setPriority(initialValues?.priority ?? 'LOW');
  }, [initialValues?.priority]);

  useEffect(() => {
    setSteps(mapInitialSteps(initialValues?.steps, currentUserId));
  }, [currentUserId, initialValues?.steps]);

  useEffect(() => {
    if (!currentUserId) return;
    setSteps((prev) =>
      prev.map((step) => (step.ownerId ? step : { ...step, ownerId: currentUserId })),
    );
  }, [currentUserId]);

  const addStep = () =>
    setSteps((prev) => [
      ...prev,
      {
        id: generateStepId(),
        title: '',
        description: '',
        ownerId: currentUserId,
        due: '',
      },
    ]);

  const updateStep = (
    id: string,
    key: 'title' | 'description' | 'ownerId' | 'due',
    value: string,
  ) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, [key]: value } : s)));
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

  const submitFlow = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    setFlowError(null);
    setIsSubmitting(true);
    try {
      const payload: TaskFormSubmitValues = {
        title: flowTitle,
        description,
        priority,
        steps: steps.map((step) => {
          const base = {
            title: step.title,
            description: step.description,
            ownerId: step.ownerId,
          };
          if (!step.due) {
            return base;
          }
          return {
            ...base,
            dueAt: new Date(step.due + 'T00:00:00Z').toISOString(),
          };
        }),
      };

      const result = await onSubmit(payload);
      if (result && 'error' in result && result.error) {
        setFlowError(result.error);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save task';
      setFlowError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

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
              <label className="block text-sm font-medium text-[#4B5563]" htmlFor="flow-description">
                Description
              </label>
              <Textarea
                id="flow-description"
                placeholder="Provide additional details about the task"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[120px] border-[#E5E7EB] placeholder:text-[#9CA3AF] hover:border-indigo-300 hover:shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:ring-offset-0"
              />
            </div>
            <div className="space-y-2">
              <span className="block text-sm font-medium text-[#4B5563]">Priority</span>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Priority">
                {PRIORITY_OPTIONS.map((option) => {
                  const isActive = priority === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setPriority(option.value)}
                      aria-pressed={isActive}
                      className={cn(
                        'flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition',
                        isActive
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-600 shadow-sm'
                          : 'border-[#E5E7EB] text-[#4B5563] hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600',
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: option.color }}
                      />
                      {option.label}
                    </button>
                  );
                })}
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
          {onCancel ? (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="border-[#E5E7EB] text-[#4B5563] hover:border-[#D1D5DB] hover:bg-[#F3F4F6] hover:text-[#1F2937]"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          ) : null}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? submitPendingLabel ?? submitLabel : submitLabel}
          </Button>
        </div>
      </form>
    </div>
  );
}

function StepCard({
  step,
  index,
  users,
  onUpdate,
  showDivider,
}: {
  step: InternalStep;
  index: number;
  users: TaskFormUser[];
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
            <label className="block text-sm font-medium text-[#4B5563]" htmlFor={`step-title-${step.id}`}>
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
            <label className="block text-sm font-medium text-[#4B5563]" htmlFor={`step-description-${step.id}`}>
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
            <label className="block text-sm font-medium text-[#4B5563]" htmlFor={`step-owner-${step.id}`}>
              Step Owner
            </label>
            <select
              id={`step-owner-${step.id}`}
              value={step.ownerId}
              onChange={(e) => onUpdate(step.id, 'ownerId', e.target.value)}
              className="flex h-10 w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#111827] transition-shadow focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:ring-offset-0 hover:border-indigo-300 hover:shadow-sm"
            >
              <option value="">Select owner</option>
              {users.map((user) => (
                <option key={user._id} value={user._id}>
                  {user.name}
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
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" focusable="false">
      <circle cx="6" cy="5" r="1.2" />
      <circle cx="6" cy="10" r="1.2" />
      <circle cx="6" cy="15" r="1.2" />
      <circle cx="14" cy="5" r="1.2" />
      <circle cx="14" cy="10" r="1.2" />
      <circle cx="14" cy="15" r="1.2" />
    </svg>
  );
}

