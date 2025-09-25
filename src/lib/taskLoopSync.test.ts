import { describe, it, expect } from 'vitest';
import { Types } from 'mongoose';
import { prepareLoopFromSteps } from './taskLoopSync';

const buildStep = (ownerId: Types.ObjectId, title: string) => ({
  title,
  ownerId,
  status: 'OPEN' as const,
});

describe('prepareLoopFromSteps', () => {
  it('assigns cumulative dependencies for each step', () => {
    const taskId = new Types.ObjectId();
    const steps = [
      buildStep(new Types.ObjectId(), 'First'),
      buildStep(new Types.ObjectId(), 'Second'),
      buildStep(new Types.ObjectId(), 'Third'),
    ];

    const result = prepareLoopFromSteps(taskId, steps, 0, 'OPEN');

    expect(result).not.toBeNull();
    expect(result?.sequence[0]?.dependencies).toEqual([]);
    expect(result?.sequence[1]?.dependencies).toEqual([0]);
    expect(result?.sequence[2]?.dependencies).toEqual([0, 1]);
  });
});
