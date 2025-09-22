'use client';

import { useEffect, useState } from 'react';
import { DndContext, type DragEndEvent, closestCenter } from '@dnd-kit/core';
import { SortableContext, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
          dependencies,
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
      <DialogContent>
        {mode === 'edit' ? (
          <div className="flex flex-col gap-4">
            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={steps.map((s: LoopStep) => s.id)}>
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
              </SortableContext>
            </DndContext>
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
        ) : (
          <div className="flex flex-col gap-4">
            <LoopTimeline
              steps={steps.map((s: LoopStep) => ({ ...s, status: 'PENDING' }))}
              users={users}
            />
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
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="border rounded p-2 flex items-start gap-2 bg-[var(--color-surface)]"
    >
      <div {...attributes} {...listeners} className="cursor-grab p-2 select-none">
        ⋮⋮
      </div>
      <div className="flex flex-col gap-1">
        <Button variant="outline" onClick={moveUp} disabled={index === 0}>
          Move up
        </Button>
        <Button
          variant="outline"
          onClick={moveDown}
          disabled={index === allSteps.length - 1}
        >
          Move down
        </Button>
      </div>
      <div className="flex-1 flex flex-col gap-2">
        <select
          value={step.assignedTo}
          onChange={(e) => onChange(step.id, { assignedTo: e.target.value })}
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
          placeholder="Description"
          value={step.description}
          onChange={(e) => onChange(step.id, { description: e.target.value })}
        />
        <Input
          placeholder="Estimated Time"
          type="number"
          value={step.estimatedTime ?? ''}
          onChange={(e) =>
            onChange(step.id, {
              estimatedTime: e.target.value ? Number(e.target.value) : undefined,
            })
          }
        />
        <select
          multiple
          value={step.dependencies}
          onChange={(e) =>
            onChange(step.id, {
              dependencies: Array.from(e.target.selectedOptions).map((o) => o.value),
            })
          }
          className="flex h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
        >
        {allSteps
          .filter((s: LoopStep) => s.id !== step.id)
          .map((s: LoopStep) => (
            <option key={s.id} value={s.id}>
              {s.description || 'Untitled Step'}
            </option>
          ))}
        </select>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
      <Button
        variant="ghost"
        className="text-red-600"
        onClick={() => onRemove(step.id)}
      >
        Remove
      </Button>
    </div>
  );
}

