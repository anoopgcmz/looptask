'use client';

import { useEffect, useState } from 'react';
import { DndContext, type DragEndEvent, closestCenter } from '@dnd-kit/core';
import { SortableContext, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog';
import useLoopBuilder, { type LoopStep } from '@/hooks/useLoopBuilder';
import { registerLoopBuilder } from '@/lib/loopBuilder';
import LoopTimeline from '@/components/loop-timeline';

export function buildLoopSaveRequest(steps: LoopStep[], hasExistingLoop: boolean): {
  method: 'POST' | 'PATCH';
  body: { sequence: unknown[] };
  orderedSteps: LoopStep[];
} {
  const orderedSteps = [...steps].sort((a, b) => a.index - b.index);
  const indexById = new Map(orderedSteps.map((step) => [step.id, step.index]));

  if (hasExistingLoop) {
    return {
      method: 'PATCH',
      body: {
        sequence: orderedSteps.map(({ index, assignedTo, description }) => {
          const payload: { index: number; assignedTo?: string; description?: string } = {
            index,
          };
          if (assignedTo) payload.assignedTo = assignedTo;
          if (description) payload.description = description;
          return payload;
        }),
      },
      orderedSteps,
    };
  }

  return {
    method: 'POST',
    body: {
      sequence: orderedSteps.map(
        ({ assignedTo, description, estimatedTime, dependencies }) => ({
          assignedTo,
          description,
          estimatedTime,
          dependencies: dependencies
            .map((depId) => indexById.get(depId))
            .filter((value): value is number => typeof value === 'number'),
        })
      ),
    },
    orderedSteps,
  };
}

interface User {
  _id: string;
  name: string;
}

export default function LoopBuilder() {
  const {
    open,
    openBuilder,
    closeBuilder,
    taskId,
    steps,
    hasExistingLoop,
    addStep,
    updateStep,
    removeStep,
    reorderSteps,
  } = useLoopBuilder();
  const [users, setUsers] = useState<User[]>([]);
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    registerLoopBuilder(openBuilder);
  }, [openBuilder]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/users', { credentials: 'include' });
        if (res.ok) setUsers((await res.json()) as User[]);
      } catch {
        // ignore
      }
    };
    if (open) {
      setMode('edit');
      void load();
    }
  }, [open]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = steps.findIndex((s: LoopStep) => s.id === active.id);
    const newIndex = steps.findIndex((s: LoopStep) => s.id === over.id);
    reorderSteps(oldIndex, newIndex);
  };

  const handleSave = async () => {
    if (!taskId) return;
    const request = buildLoopSaveRequest(steps, hasExistingLoop);
    const res = await fetch(`/api/tasks/${taskId}/loop`, {
      method: request.method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request.body),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as unknown;
        if (
          data &&
          typeof data === 'object' &&
          'errors' in data &&
          Array.isArray((data as { errors?: unknown }).errors)
        ) {
          const map: Record<string, string> = {};
          (data as { errors: { index: number; message: string }[] }).errors.forEach((e) => {
            const id = request.orderedSteps[e.index]?.id;
            if (id) map[id] = e.message;
          });
          setErrors(map);
          setMode('edit');
          return;
        }
      return;
    }
    closeBuilder();
  };

  const handleUpdateStep = (id: string, data: Partial<LoopStep>) => {
    updateStep(id, data);
    setErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleRemoveStep = (id: string) => {
    removeStep(id);
    setErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && closeBuilder()}>
      <DialogContent fullScreen className="overflow-hidden p-0">
        <div className="flex h-full flex-col overflow-hidden">
          <div className="border-b border-[var(--color-border)] px-6 py-4">
            <h2 className="text-lg font-semibold">Manage Loop</h2>
          </div>
          <div className="flex flex-1 flex-col gap-6 overflow-hidden p-6">
            {mode === 'edit' ? (
              <div className="flex h-full flex-col gap-4">
                <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={steps.map((s: LoopStep) => s.id)}>
                    <div className="flex flex-1 flex-col items-center overflow-y-auto pr-1 sm:pr-2">
                      <div className="flex w-full max-w-3xl flex-col gap-5">
                        {steps.map((step) => (
                          <StepItem
                            key={step.id}
                            step={step}
                            allSteps={steps}
                            users={users}
                            onChange={handleUpdateStep}
                            onRemove={handleRemoveStep}
                            index={step.index}
                            onReorder={reorderSteps}
                            error={errors[step.id]}
                          />
                        ))}
                      </div>
                    </div>
                  </SortableContext>
                </DndContext>
                <div className="flex flex-col gap-4">
                  <Button variant="outline" onClick={addStep}>
                    Add Step
                  </Button>
                  <div className="flex justify-end gap-2">
                    <DialogClose asChild>
                      <Button variant="outline" onClick={closeBuilder}>
                        Cancel
                      </Button>
                    </DialogClose>
                    <Button onClick={() => setMode('preview')} disabled={!steps.length}>
                      Preview
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-full flex-col gap-4">
                <div className="flex-1 overflow-y-auto pr-1 sm:pr-2">
                  <LoopTimeline
                    steps={steps.map((s: LoopStep) => ({ ...s, status: 'PENDING' }))}
                    users={users}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setMode('edit')}>
                    Edit
                  </Button>
                  <DialogClose asChild>
                    <Button variant="outline" onClick={closeBuilder}>
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button onClick={handleSave}>Save Loop</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StepItem({
  step,
  allSteps,
  users,
  onChange,
  onRemove,
  index,
  onReorder,
  error,
}: {
  step: LoopStep;
  allSteps: LoopStep[];
  users: User[];
  onChange: (id: string, data: Partial<LoopStep>) => void;
  onRemove: (id: string) => void;
  index: number;
  onReorder: (from: number, to: number) => void;
  error?: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: step.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const moveUp = () => onReorder(index, index - 1);
  const moveDown = () => onReorder(index, index + 1);
  const selectClasses =
    'h-10 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text)] shadow-sm transition focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-opacity-30 focus:ring-offset-2 focus:ring-offset-[var(--color-surface)] focus:border-[var(--color-primary)]';
  const multiSelectClasses =
    'w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] shadow-sm transition focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-opacity-30 focus:ring-offset-2 focus:ring-offset-[var(--color-surface)] focus:border-[var(--color-primary)] min-h-[3.5rem]';
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div
            {...attributes}
            {...listeners}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-dashed border-[var(--color-border)] bg-white text-lg text-[var(--color-text-secondary)] cursor-grab select-none"
          >
            ⋮⋮
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-secondary)]">
              Step {index + 1}
            </p>
            <p className="truncate text-base font-semibold text-[var(--color-text)]">
              {step.description?.trim() || 'Untitled step'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={moveUp}
            disabled={index === 0}
            className="h-8 px-3 text-xs font-semibold uppercase tracking-wide"
          >
            Move up
          </Button>
          <Button
            variant="outline"
            onClick={moveDown}
            disabled={index === allSteps.length - 1}
            className="h-8 px-3 text-xs font-semibold uppercase tracking-wide"
          >
            Move down
          </Button>
          <Button
            variant="outline"
            className="h-8 px-3 text-xs font-semibold uppercase tracking-wide border-red-200 text-red-600 hover:bg-red-50"
            onClick={() => onRemove(step.id)}
          >
            Remove
          </Button>
        </div>
      </div>

      <div className="mt-5 space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-medium text-[var(--color-text)]">
            Assignee
            <select
              value={step.assignedTo}
              onChange={(e) => onChange(step.id, { assignedTo: e.target.value })}
              className={selectClasses}
            >
              <option value="">Select a teammate</option>
              {users.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-[var(--color-text)]">
            Estimated time (hours)
            <Input
              placeholder="e.g. 4"
              inputMode="numeric"
              min={0}
              type="number"
              value={step.estimatedTime ?? ''}
              onChange={(e) =>
                onChange(step.id, {
                  estimatedTime: e.target.value ? Number(e.target.value) : undefined,
                })
              }
            />
          </label>
        </div>

        <label className="flex flex-col gap-1 text-sm font-medium text-[var(--color-text)]">
          Description
          <Textarea
            rows={4}
            placeholder="Add helpful details so your teammate knows exactly what to do."
            value={step.description}
            onChange={(e) => onChange(step.id, { description: e.target.value })}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-[var(--color-text)]">
          Dependencies
          <select
            multiple
            value={step.dependencies}
            onChange={(e) =>
              onChange(step.id, {
                dependencies: Array.from(e.target.selectedOptions).map((o) => o.value),
              })
            }
            className={multiSelectClasses}
          >
            {allSteps
              .filter((s: LoopStep) => s.id !== step.id)
              .map((s: LoopStep) => (
                <option key={s.id} value={s.id}>
                  {s.description || 'Untitled Step'}
                </option>
              ))}
          </select>
          <span className="text-xs font-normal text-[var(--color-text-secondary)]">
            Hold Ctrl or Command to select multiple steps that must be completed first.
          </span>
        </label>

        {error && (
          <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

