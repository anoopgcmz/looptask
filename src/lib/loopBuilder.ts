export interface LoopBuilderData {
  sequence?: Array<{
    id?: string;
    _id?: string;
    assignedTo?: string | { _id?: string } | null;
    description?: string | null;
    estimatedTime?: number | null;
    dependencies?: Array<string | number> | null;
  }>;
}

let listener: ((taskId: string, loop?: LoopBuilderData | null) => void) | null = null;

export function registerLoopBuilder(
  fn: (taskId: string, loop?: LoopBuilderData | null) => void
): void {
  listener = fn;
}

export function openLoopBuilder(taskId: string, loop?: LoopBuilderData | null): void {
  listener?.(taskId, loop);
}

