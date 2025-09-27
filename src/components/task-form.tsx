'use client';

import { useState, useEffect, useMemo, type CSSProperties } from 'react';
import Link from 'next/link';
import { DndContext, type DragEndEvent, closestCenter } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { getTodayDateInputValue, isDateInputBeforeToday } from '@/lib/dateInput';
import type { ProjectSummary } from '@/types/api/project';

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
  projectId: string;
}

export interface TaskFormSubmitValues {
  title: string;
  description?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  projectId: string;
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
  projects: ProjectSummary[];
  projectsLoading?: boolean;
  projectSelectDisabled?: boolean;
  onProjectsRefresh?: () => Promise<void>;
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

type StepFieldKey = 'title' | 'description' | 'ownerId' | 'due';

type StepErrors = Partial<Record<StepFieldKey, string>>;

interface FormErrors {
  title?: string;
  description?: string;
  projectId?: string;
  steps: Record<string, StepErrors>;
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

const REQUIRED_FIELDS_ERROR = 'Please fill in all required fields.';
const PAST_DUE_ERROR = 'Due date cannot be in the past';

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
  projects,
  projectsLoading = false,
  projectSelectDisabled = false,
  onProjectsRefresh,
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
  const [projectId, setProjectId] = useState(initialValues?.projectId ?? '');
  const [steps, setSteps] = useState<InternalStep[]>(() =>
    mapInitialSteps(initialValues?.steps, currentUserId),
  );
  const [flowError, setFlowError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<FormErrors>({ steps: {} });
  const minDueDate = useMemo(() => getTodayDateInputValue(), []);

  const clearFormFieldError = (field: 'title' | 'description' | 'projectId') => {
    setFormErrors((prev) => {
      if (!prev[field]) return prev;
      return { ...prev, [field]: undefined };
    });
    setFlowError((prev) =>
      prev === REQUIRED_FIELDS_ERROR || prev === PAST_DUE_ERROR ? null : prev,
    );
  };

  const clearStepError = (id: string, key: StepFieldKey) => {
    setFormErrors((prev) => {
      const currentErrors = prev.steps[id];
      if (!currentErrors?.[key]) {
        return prev;
      }
      const nextStepErrors: StepErrors = { ...currentErrors };
      delete nextStepErrors[key];
      const nextSteps = { ...prev.steps };
      if (Object.keys(nextStepErrors).length > 0) {
        nextSteps[id] = nextStepErrors;
      } else {
        delete nextSteps[id];
      }
      return { ...prev, steps: nextSteps };
    });
    setFlowError((prev) =>
      prev === REQUIRED_FIELDS_ERROR || prev === PAST_DUE_ERROR ? null : prev,
    );
  };

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
    setProjectId(initialValues?.projectId ?? '');
  }, [initialValues?.projectId]);

  useEffect(() => {
    if (!projectId || projectsLoading) return;
    if (projects.some((project) => project._id === projectId)) {
      return;
    }
    setProjectId('');
  }, [projectId, projects, projectsLoading]);

  useEffect(() => {
    setSteps(mapInitialSteps(initialValues?.steps, currentUserId));
  }, [currentUserId, initialValues?.steps]);

  useEffect(() => {
    if (!currentUserId) return;
    setSteps((prev) =>
      prev.map((step) => (step.ownerId ? step : { ...step, ownerId: currentUserId })),
    );
  }, [currentUserId]);

  useEffect(() => {
    if (!onProjectsRefresh) return;
    void onProjectsRefresh();
    const handleFocus = () => {
      void onProjectsRefresh();
    };
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [onProjectsRefresh]);

  const addStep = () => {
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
  };

  const updateStep = (id: string, key: StepFieldKey, value: string) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, [key]: value } : s)));
    if (key === 'due') {
      if (!value.trim()) {
        return;
      }
      if (!isDateInputBeforeToday(value)) {
        clearStepError(id, key);
      }
      return;
    }
    if (value.trim()) {
      clearStepError(id, key);
    }
  };

  const removeStep = (id: string) => {
    setSteps((prev) => prev.filter((step) => step.id !== id));
    setFormErrors((prev) => {
      if (!prev.steps[id]) return prev;
      const nextSteps = { ...prev.steps };
      delete nextSteps[id];
      return { ...prev, steps: nextSteps };
    });
  };

  const moveStep = (id: string, direction: 'up' | 'down') => {
    setSteps((prev) => {
      const currentIndex = prev.findIndex((step) => step.id === id);
      if (currentIndex === -1) {
        return prev;
      }
      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) {
        return prev;
      }
      return arrayMove(prev, currentIndex, targetIndex);
    });
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

  const validateForm = () => {
    const errors: FormErrors = { steps: {} };
    let hasError = false;
    let hasPastDue = false;

    if (!flowTitle.trim()) {
      errors.title = 'Title is required';
      hasError = true;
    }

    if (!description.trim()) {
      errors.description = 'Description is required';
      hasError = true;
    }

    if (!projectId) {
      errors.projectId = 'Select a project';
      hasError = true;
    }

    steps.forEach((step) => {
      const stepErrors: StepErrors = {};
      if (!step.title.trim()) {
        stepErrors.title = 'Step name is required';
      }
      if (!step.description.trim()) {
        stepErrors.description = 'Step description is required';
      }
      if (!step.ownerId.trim()) {
        stepErrors.ownerId = 'Step owner is required';
      }
      if (!step.due.trim()) {
        stepErrors.due = 'Due date is required';
      } else if (isDateInputBeforeToday(step.due)) {
        stepErrors.due = PAST_DUE_ERROR;
        hasPastDue = true;
      }
      if (Object.keys(stepErrors).length > 0) {
        errors.steps[step.id] = stepErrors;
        hasError = true;
      }
    });

    if (hasError) {
      setFormErrors(errors);
      setFlowError(hasPastDue ? PAST_DUE_ERROR : REQUIRED_FIELDS_ERROR);
      return false;
    }

    setFormErrors({ steps: {} });
    setFlowError(null);
    return true;
  };

  const submitFlow = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    if (!validateForm()) {
      return;
    }
    setFlowError(null);
    setIsSubmitting(true);
    try {
      const payload: TaskFormSubmitValues = {
        title: flowTitle,
        description,
        priority,
        projectId,
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
      <form onSubmit={submitFlow} noValidate className="mx-auto max-w-3xl space-y-6">
        <Card className="space-y-5">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold text-[#111827]">Project</h2>
            <p className="text-sm text-[#4B5563]">
              Tasks must be associated with an existing project. Manage projects from the{' '}
              <Link href="/projects" className="font-medium text-indigo-600 hover:text-indigo-500">
                Projects page
              </Link>
              .
            </p>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[#4B5563]" htmlFor="task-project">
              Select project
            </label>
            <Select
              id="task-project"
              value={projectId}
              onChange={(event) => {
                const value = event.target.value;
                setProjectId(value);
                if (value) {
                  clearFormFieldError('projectId');
                }
              }}
              disabled={
                (projectSelectDisabled && Boolean(projectId)) ||
                projectsLoading ||
                projects.length === 0
              }
              className={cn(
                'border border-[#E5E7EB] bg-white text-[#111827]',
                formErrors.projectId && 'border-red-500 focus:border-red-500 focus:ring-red-200',
              )}
              aria-invalid={Boolean(formErrors.projectId)}
            >
              <option value="" disabled>
                {projectsLoading
                  ? 'Loading projects…'
                  : projects.length === 0
                    ? 'No projects available'
                    : 'Select a project'}
              </option>
              {!projectsLoading
                ? projects.map((project) => (
                  <option key={project._id} value={project._id}>
                    {project.name}
                    {project.type?.name ? ` • ${project.type.name}` : ''}
                  </option>
                ))
                : null}
            </Select>
            {projects.length === 0 && !projectsLoading ? (
              <p className="text-sm text-[#4B5563]">
                No projects yet. Visit the{' '}
                <Link href="/projects" className="font-medium text-indigo-600 hover:text-indigo-500">
                  Projects page
                </Link>{' '}
                to create one before adding tasks.
              </p>
            ) : null}
            {formErrors.projectId ? (
              <p className="text-sm text-red-600">{formErrors.projectId}</p>
            ) : null}
          </div>
        </Card>

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
                onChange={(e) => {
                  const value = e.target.value;
                  setFlowTitle(value);
                  if (value.trim()) {
                    clearFormFieldError('title');
                  }
                }}
                className={cn(
                  'border-[#E5E7EB] placeholder:text-[#9CA3AF] hover:border-indigo-300 hover:shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:ring-offset-0',
                  formErrors.title && 'border-red-500 focus:border-red-500 focus:ring-red-200',
                )}
                aria-invalid={Boolean(formErrors.title)}
              />
              {formErrors.title ? (
                <p className="text-sm text-red-600">{formErrors.title}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[#4B5563]" htmlFor="flow-description">
                Description
              </label>
              <Textarea
                id="flow-description"
                placeholder="Provide additional details about the task"
                value={description}
                onChange={(e) => {
                  const value = e.target.value;
                  setDescription(value);
                  if (value.trim()) {
                    clearFormFieldError('description');
                  }
                }}
                className={cn(
                  'min-h-[120px] border-[#E5E7EB] placeholder:text-[#9CA3AF] hover:border-indigo-300 hover:shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:ring-offset-0',
                  formErrors.description && 'border-red-500 focus:border-red-500 focus:ring-red-200',
                )}
                aria-invalid={Boolean(formErrors.description)}
              />
              {formErrors.description ? (
                <p className="text-sm text-red-600">{formErrors.description}</p>
              ) : null}
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
                  onRemove={removeStep}
                  onMove={moveStep}
                  disableMoveUp={index === 0}
                  disableMoveDown={index === steps.length - 1}
                  showDivider={index > 0}
                  showControls={steps.length > 1}
                  errors={formErrors.steps[step.id]}
                  minDueDate={minDueDate}
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
  onRemove,
  onMove,
  disableMoveUp,
  disableMoveDown,
  showDivider,
  showControls,
  errors,
  minDueDate,
}: {
  step: InternalStep;
  index: number;
  users: TaskFormUser[];
  onUpdate: (id: string, key: StepFieldKey, value: string) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, direction: 'up' | 'down') => void;
  disableMoveUp: boolean;
  disableMoveDown: boolean;
  showDivider: boolean;
  showControls: boolean;
  errors?: StepErrors;
  minDueDate: string;
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
          errors && Object.keys(errors).length > 0 && 'border-red-200',
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
                Step {index + 1}
              </p>
              <p className="text-base font-semibold text-[#111827]">
                {step.title.trim() || 'Untitled Step'}
              </p>
            </div>
            {showControls ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onMove(step.id, 'up')}
                  disabled={disableMoveUp}
                  className="h-8 px-3 text-xs font-semibold uppercase tracking-wide border-[#E5E7EB] text-[#4B5563] hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600"
                >
                  Move Up
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onMove(step.id, 'down')}
                  disabled={disableMoveDown}
                  className="h-8 px-3 text-xs font-semibold uppercase tracking-wide border-[#E5E7EB] text-[#4B5563] hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600"
                >
                  Move Down
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onRemove(step.id)}
                  className="h-8 px-3 text-xs font-semibold uppercase tracking-wide border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50"
                >
                  Remove
                </Button>
              </div>
            ) : null}
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[#4B5563]" htmlFor={`step-title-${step.id}`}>
              Step Name
            </label>
            <Input
              id={`step-title-${step.id}`}
              placeholder="Enter step name"
              value={step.title}
              onChange={(e) => onUpdate(step.id, 'title', e.target.value)}
              className={cn(
                'border-[#E5E7EB] placeholder:text-[#9CA3AF] hover:border-indigo-300 hover:shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:ring-offset-0',
                errors?.title && 'border-red-500 focus:border-red-500 focus:ring-red-200',
              )}
              aria-invalid={Boolean(errors?.title)}
            />
            {errors?.title ? <p className="text-sm text-red-600">{errors.title}</p> : null}
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
              className={cn(
                'min-h-[120px] border-[#E5E7EB] placeholder:text-[#9CA3AF] hover:border-indigo-300 hover:shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:ring-offset-0',
                errors?.description && 'border-red-500 focus:border-red-500 focus:ring-red-200',
              )}
              aria-invalid={Boolean(errors?.description)}
            />
            {errors?.description ? (
              <p className="text-sm text-red-600">{errors.description}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[#4B5563]" htmlFor={`step-owner-${step.id}`}>
              Step Owner
            </label>
            <select
              id={`step-owner-${step.id}`}
              value={step.ownerId}
              onChange={(e) => onUpdate(step.id, 'ownerId', e.target.value)}
              className={cn(
                'flex h-10 w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#111827] transition-shadow focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:ring-offset-0 hover:border-indigo-300 hover:shadow-sm',
                errors?.ownerId && 'border-red-500 focus:border-red-500 focus:ring-red-200',
              )}
              aria-invalid={Boolean(errors?.ownerId)}
            >
              <option value="">Select owner</option>
              {users.map((user) => (
                <option key={user._id} value={user._id}>
                  {user.name}
                </option>
              ))}
            </select>
            {errors?.ownerId ? (
              <p className="text-sm text-red-600">{errors.ownerId}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[#4B5563]" htmlFor={`step-due-${step.id}`}>
              Due Date
            </label>
            <Input
              id={`step-due-${step.id}`}
              type="date"
              min={minDueDate}
              value={step.due}
              onChange={(e) => onUpdate(step.id, 'due', e.target.value)}
              className={cn(
                'border-[#E5E7EB] placeholder:text-[#9CA3AF] hover:border-indigo-300 hover:shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:ring-offset-0',
                errors?.due && 'border-red-500 focus:border-red-500 focus:ring-red-200',
              )}
              aria-invalid={Boolean(errors?.due)}
            />
            {errors?.due ? <p className="text-sm text-red-600">{errors.due}</p> : null}
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

