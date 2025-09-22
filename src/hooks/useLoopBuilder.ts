'use client';

import { useCallback, useState } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import type { LoopBuilderData } from '@/lib/loopBuilder';

export interface LoopStep {
  id: string;
  assignedTo: string;
  description: string;
  estimatedTime?: number;
  dependencies: string[];
  index: number;
}

export function normalizeLoopSteps(sequence?: LoopBuilderData['sequence']): LoopStep[] {
  if (!Array.isArray(sequence)) return [];

  const baseIds = sequence.map((step, idx) => {
    if (step && typeof step === 'object') {
      const record = step as Record<string, unknown>;
      const explicitId = record.id ?? record._id;
      if (typeof explicitId === 'string' && explicitId.length) {
        return explicitId;
      }
    }
    return String(idx);
  });

  return sequence.map((raw, idx) => {
    const record = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

    let assignedTo = '';
    const assignedValue = record.assignedTo;
    if (typeof assignedValue === 'string') {
      assignedTo = assignedValue;
    } else if (assignedValue && typeof assignedValue === 'object') {
      const nestedId = (assignedValue as Record<string, unknown>)._id;
      if (typeof nestedId === 'string') assignedTo = nestedId;
    }

    const dependenciesRaw = Array.isArray(record.dependencies)
      ? (record.dependencies as Array<string | number | null | undefined>)
      : [];
    const dependencies = dependenciesRaw
      .map((dep) => {
        if (typeof dep === 'number') {
          return baseIds[dep] ?? String(dep);
        }
        if (typeof dep === 'string') {
          return dep;
        }
        return null;
      })
      .filter((value): value is string => Boolean(value));

    const estimatedTime = record.estimatedTime;

    return {
      id: baseIds[idx],
      assignedTo,
      description: typeof record.description === 'string' ? record.description : '',
      estimatedTime: typeof estimatedTime === 'number' ? estimatedTime : undefined,
      dependencies,
      index: idx,
    } satisfies LoopStep;
  });
}

export default function useLoopBuilder() {
  const [open, setOpen] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [steps, setSteps] = useState<LoopStep[]>([]);
  const [hasExistingLoop, setHasExistingLoop] = useState(false);

  const openBuilder = useCallback(
    async (id: string, loop?: LoopBuilderData | null) => {
      setTaskId(id);
      setOpen(true);

      if (loop === null) {
        setSteps([]);
        setHasExistingLoop(false);
        return;
      }

      if (loop !== undefined) {
        setSteps(normalizeLoopSteps(loop.sequence));
        setHasExistingLoop(true);
        return;
      }

      try {
        const res = await fetch(`/api/tasks/${id}/loop`);
        if (!res.ok) {
          setSteps([]);
          setHasExistingLoop(false);
          return;
        }

        const data = (await res.json()) as LoopBuilderData;
        setSteps(normalizeLoopSteps(data.sequence));
        setHasExistingLoop(true);
      } catch {
        setSteps([]);
        setHasExistingLoop(false);
      }
    },
    []
  );

  const closeBuilder = () => setOpen(false);

  const addStep = () => {
    setSteps((s: LoopStep[]) => {
      const nextIndex = s.length;
      return [
        ...s,
        {
          id: Math.random().toString(36).slice(2),
          assignedTo: '',
          description: '',
          dependencies: [],
          index: nextIndex,
        },
      ];
    });
  };

  const updateStep = (id: string, data: Partial<LoopStep>) => {
    setSteps((s: LoopStep[]) =>
      s.map((step) => (step.id === id ? { ...step, ...data } : step))
    );
  };

  const removeStep = (id: string) => {
    setSteps((s: LoopStep[]) =>
      s
        .filter((step) => step.id !== id)
        .map((step, idx) => ({ ...step, index: idx }))
    );
  };

  const reorderSteps = (from: number, to: number) => {
    setSteps((s: LoopStep[]) =>
      arrayMove(s, from, to).map((step, idx) => ({ ...step, index: idx }))
    );
  };

  return {
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
  };
}

