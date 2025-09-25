import { Types } from 'mongoose';
import type { IStep, TaskStatus } from '@/models/Task';
import type { ILoopStep } from '@/models/TaskLoop';

export interface PreparedLoopData {
  sequence: Array<
    Pick<
      ILoopStep,
      'taskId' | 'assignedTo' | 'description' | 'status' | 'dependencies' | 'completedAt'
    >
  >;
  currentStep: number;
  isActive: boolean;
}

function resolveDescription(step: IStep, index: number): string {
  const { description, title } = step;
  if (typeof description === 'string' && description.trim().length) {
    return description.trim();
  }
  if (typeof title === 'string' && title.trim().length) {
    return title.trim();
  }
  return `Step ${index + 1}`;
}

export function prepareLoopFromSteps(
  taskId: Types.ObjectId,
  steps: IStep[] | undefined,
  currentStepIndex?: number | null,
  taskStatus?: TaskStatus
): PreparedLoopData | null {
  if (!steps?.length) return null;

  const fallbackIndex = steps.findIndex((s) => s.status !== 'DONE');
  const validIndex =
    typeof currentStepIndex === 'number' &&
    currentStepIndex >= 0 &&
    currentStepIndex < steps.length
      ? currentStepIndex
      : fallbackIndex;

  const activeIndex = validIndex === -1 ? fallbackIndex : validIndex;

  const sequence = steps.map((step, idx) => {
    const completed = step.status === 'DONE';
    let status: ILoopStep['status'];
    if (completed) {
      status = 'COMPLETED';
    } else if (activeIndex === -1) {
      status = 'COMPLETED';
    } else if (idx === activeIndex) {
      status = 'ACTIVE';
    } else if (idx < activeIndex) {
      status = 'COMPLETED';
    } else {
      status = 'BLOCKED';
    }

    return {
      taskId,
      assignedTo: new Types.ObjectId(step.ownerId),
      description: resolveDescription(step, idx),
      status,
      dependencies: idx === 0 ? [] : [idx - 1],
      completedAt: completed ? step.completedAt : undefined,
    } satisfies PreparedLoopData['sequence'][number];
  });

  const hasIncomplete = sequence.some((s) => s.status !== 'COMPLETED');
  const currentStep = hasIncomplete
    ? activeIndex >= 0
      ? activeIndex
      : sequence.findIndex((s) => s.status !== 'COMPLETED')
    : -1;
  const isActive = hasIncomplete && (taskStatus ? taskStatus !== 'DONE' : true);

  return {
    sequence,
    currentStep,
    isActive,
  };
}
