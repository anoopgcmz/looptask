'use client';

import { useState } from 'react';
import { arrayMove } from '@dnd-kit/sortable';

export interface LoopStep {
  id: string;
  assignedTo: string;
  description: string;
  estimatedTime?: number;
  dependencies: string[];
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
    setSteps((s) => [
      ...s,
      {
        id: Math.random().toString(36).slice(2),
        assignedTo: '',
        description: '',
        dependencies: [],
      },
    ]);
  };

  const updateStep = (id: string, data: Partial<LoopStep>) => {
    setSteps((s) => s.map((step) => (step.id === id ? { ...step, ...data } : step)));
  };

  const removeStep = (id: string) => {
    setSteps((s) => s.filter((step) => step.id !== id));
  };

  const reorderSteps = (from: number, to: number) => {
    setSteps((s) => arrayMove(s, from, to));
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
  };
}

