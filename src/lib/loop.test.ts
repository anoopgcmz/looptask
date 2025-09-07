import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Types } from 'mongoose';

vi.mock('@/lib/db', () => ({ default: vi.fn() }));

const notifyLoopStepReady = vi.fn();
const notifyAssignment = vi.fn();
vi.mock('@/lib/notify', () => ({ notifyLoopStepReady, notifyAssignment }));

const findOne = vi.fn();
vi.mock('@/models/TaskLoop', () => ({ default: { findOne } }));

interface Task { _id: Types.ObjectId }
const findTaskById = vi.fn<[string], Promise<Task | null>>();
vi.mock('@/models/Task', () => ({ default: { findById: findTaskById } }));

const createHistory = vi.fn();
vi.mock('@/models/LoopHistory', () => ({ default: { create: createHistory } }));

import { completeStep } from './loop';

interface TestLoop {
  taskId: Types.ObjectId;
  sequence: Array<{
    assignedTo: Types.ObjectId;
    status: string;
    description?: string;
    dependencies?: number[];
  }>;
  currentStep: number;
  isActive: boolean;
  save: () => Promise<null>;
  parallel?: boolean;
}

describe('completeStep', () => {
  const taskId = new Types.ObjectId();
  const userA = new Types.ObjectId();
  const userB = new Types.ObjectId();
  const userC = new Types.ObjectId();
  let loop: TestLoop;

  beforeEach(() => {
    notifyLoopStepReady.mockReset();
    notifyAssignment.mockReset();
    findTaskById.mockReset();
    createHistory.mockReset();
    loop = {
      taskId,
      parallel: true,
      sequence: [
        { assignedTo: userA, status: 'ACTIVE', dependencies: [] },
        { assignedTo: userB, status: 'PENDING', dependencies: [0] },
        { assignedTo: userC, status: 'PENDING', dependencies: [1] },
      ],
      currentStep: 0,
      isActive: true,
      save: vi.fn().mockResolvedValue(null),
    };
    findOne.mockResolvedValue(loop);
    findTaskById.mockResolvedValue({ _id: taskId });
  });

  it('blocks steps with unmet dependencies and activates when ready', async () => {
    let res = await completeStep(taskId.toString(), 0, userA.toString());
    expect(res).toBe(loop);
    expect(loop.sequence[0].status).toBe('COMPLETED');
    expect(loop.sequence[1].status).toBe('ACTIVE');
    expect(loop.sequence[2].status).toBe('BLOCKED');
    expect(loop.currentStep).toBe(1);
    expect(notifyAssignment).toHaveBeenCalledWith([userB], { _id: taskId }, undefined);
    expect(notifyLoopStepReady).toHaveBeenCalledWith([userB], { _id: taskId }, undefined);

    expect(createHistory).toHaveBeenCalledWith(
      expect.objectContaining({ stepIndex: 0 })
    );

    notifyLoopStepReady.mockClear();
    res = await completeStep(taskId.toString(), 1, userB.toString());
    expect(loop.sequence[1].status).toBe('COMPLETED');
    expect(loop.sequence[2].status).toBe('ACTIVE');
    expect(loop.currentStep).toBe(2);
    expect(notifyAssignment).toHaveBeenCalledWith([userC], { _id: taskId }, undefined);
    expect(notifyLoopStepReady).toHaveBeenCalledWith([userC], { _id: taskId }, undefined);
    expect(createHistory).toHaveBeenCalledWith(
      expect.objectContaining({ stepIndex: 1 })
    );
    expect(createHistory).toHaveBeenCalledTimes(2);
  });
});

