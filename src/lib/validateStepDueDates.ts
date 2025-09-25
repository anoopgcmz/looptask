import type { TaskStepPayload } from '@/types/api/task';

interface StepWithDueDate {
  title: string;
  dueAt?: Date | undefined;
}

function formatStepLabel(index: number, title: string | undefined) {
  const trimmed = title?.trim();
  return trimmed ? `"${trimmed}"` : `#${index + 1}`;
}

export function assertSequentialStepDueDates(steps: StepWithDueDate[]) {
  let previousDueAt: Date | null = null;
  let previousIndex = -1;
  steps.forEach((step, index) => {
    if (!step.dueAt) return;
    if (previousDueAt && step.dueAt < previousDueAt) {
      const currentLabel = formatStepLabel(index, step.title);
      const previousLabel = formatStepLabel(previousIndex, steps[previousIndex]?.title);
      throw new Error(
        `Step ${currentLabel} due date must not be before step ${previousLabel} due date`
      );
    }
    previousDueAt = step.dueAt;
    previousIndex = index;
  });
}

export function assertSequentialTaskStepDueDates(steps: TaskStepPayload[]) {
  assertSequentialStepDueDates(steps);
}
