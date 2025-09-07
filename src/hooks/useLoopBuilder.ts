'use client';

import { useState } from 'react';
import { arrayMove } from '@dnd-kit/sortable';

export interface LoopStep {
  id: string;
  assignedTo: string;
  description: string;
  estimatedTime?: number;
  dependencies: string[];
  index: number;
}

export interface TemplateStep {
  assignedTo: string;
  description: string;
  estimatedTime?: number;
  dependencies?: number[];
}

export default function useLoopBuilder() {
  const [open, setOpen] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [steps, setSteps] = useState<LoopStep[]>([]);

  const openBuilder = (id: string) => {
    setTaskId(id);
    setSteps([]);
    setOpen(true);
  };

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

  const setFromTemplate = (tmpl: TemplateStep[]) => {
    setSteps(() => {
      const ids = tmpl.map(() => Math.random().toString(36).slice(2));
      return tmpl.map((s, idx) => ({
        id: ids[idx],
        assignedTo: s.assignedTo,
        description: s.description,
        estimatedTime: s.estimatedTime,
        dependencies: s.dependencies?.map((d) => ids[d]) ?? [],
        index: idx,
      }));
    });
  };

  return {
    open,
    openBuilder,
    closeBuilder,
    taskId,
    steps,
    addStep,
    updateStep,
    removeStep,
    reorderSteps,
    setFromTemplate,
  };
}

