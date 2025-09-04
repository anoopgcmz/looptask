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
import LoopVisualizer from '@/components/loop-visualizer';

export default function LoopBuilder() {
  const {
    open,
    openBuilder,
    closeBuilder,
    taskId,
    steps,
    addStep,
    updateStep,
    removeStep,
    reorderSteps,
  } = useLoopBuilder();
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    registerLoopBuilder(openBuilder);
  }, [openBuilder]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/users', { credentials: 'include' });
        if (res.ok) {
          setUsers(await res.json());
        }
      } catch {
        // ignore
      }
    };
    if (open) void load();
  }, [open]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = steps.findIndex((s) => s.id === active.id);
    const newIndex = steps.findIndex((s) => s.id === over.id);
    reorderSteps(oldIndex, newIndex);
  };

  const handleSave = async () => {
    if (!taskId) return;
    await fetch(`/api/tasks/${taskId}/loop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sequence: steps.map(
          ({ assignedTo, description, estimatedTime, dependencies }) => ({
            assignedTo,
            description,
            estimatedTime,
            dependencies,
          })
        ),
      }),
    });
    closeBuilder();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && closeBuilder()}>
      <DialogContent>
        <div className="flex flex-col gap-4">
          <LoopVisualizer steps={steps} users={users} />
          <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={steps.map((s) => s.id)}>
              {steps.map((step) => (
                <StepItem
                  key={step.id}
                  step={step}
                  allSteps={steps}
                  users={users}
                  onChange={updateStep}
                  onRemove={removeStep}
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
            <Button onClick={handleSave}>Save</Button>
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
}: {
  step: LoopStep;
  allSteps: LoopStep[];
  users: any[];
  onChange: (id: string, data: Partial<LoopStep>) => void;
  onRemove: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: step.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="border rounded p-2 flex items-start gap-2 bg-[var(--color-surface)]"
    >
      <div {...attributes} {...listeners} className="cursor-grab p-2 select-none">
        ⋮⋮
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
              dependencies: Array.from(e.target.selectedOptions).map(
                (o) => o.value
              ),
            })
          }
          className="flex h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
        >
          {allSteps
            .filter((s) => s.id !== step.id)
            .map((s) => (
              <option key={s.id} value={s.id}>
                {s.description || 'Untitled Step'}
              </option>
            ))}
        </select>
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

