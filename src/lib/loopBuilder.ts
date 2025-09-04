let listener: ((taskId: string) => void) | null = null;

export function registerLoopBuilder(fn: (taskId: string) => void): void {
  listener = fn;
}

export function openLoopBuilder(taskId: string): void {
  listener?.(taskId);
}

