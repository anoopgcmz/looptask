import { describe, it, expect } from 'vitest';
import type { ILoopStep, ITaskLoop } from '@/models/TaskLoop';
import { applyStepCompletion } from './loop';

describe('applyStepCompletion', () => {
  it('blocks steps with unmet dependencies and activates when ready', () => {
    const loop = {
      sequence: [
        { assignedTo: 'userA', status: 'ACTIVE', dependencies: [] },
        { assignedTo: 'userB', status: 'PENDING', dependencies: [0] },
        { assignedTo: 'userC', status: 'PENDING', dependencies: [1] },
      ],
      currentStep: 0,
      isActive: true,
      parallel: true,
    } satisfies Partial<ITaskLoop> & { sequence: ILoopStep[] };

    const first = applyStepCompletion(loop as ITaskLoop, 0);
    expect(first.completed).toBe(true);
    expect(first.newlyActiveIndexes).toEqual([1]);
    expect(loop.sequence[0]?.status).toBe('COMPLETED');
    expect(loop.sequence[1]?.status).toBe('ACTIVE');
    expect(loop.sequence[2]?.status).toBe('BLOCKED');
    expect(loop.currentStep).toBe(1);

    const second = applyStepCompletion(loop as ITaskLoop, 1);
    expect(second.completed).toBe(true);
    expect(second.newlyActiveIndexes).toEqual([2]);
    expect(loop.sequence[1]?.status).toBe('COMPLETED');
    expect(loop.sequence[2]?.status).toBe('ACTIVE');
    expect(loop.currentStep).toBe(2);
  });
});
