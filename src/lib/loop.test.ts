import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Types } from 'mongoose';

vi.mock('@/lib/db', () => ({ default: vi.fn() }));

const notifyFlowAdvanced = vi.fn();
const notifyAssignment = vi.fn();
vi.mock('@/lib/notify', () => ({ notifyFlowAdvanced, notifyAssignment }));

const findOne = vi.fn();
vi.mock('@/models/TaskLoop', () => ({ default: { findOne } }));

const findTaskById = vi.fn();
vi.mock('@/models/Task', () => ({ default: { findById: findTaskById } }));

const createHistory = vi.fn();
vi.mock('@/models/LoopHistory', () => ({ default: { create: createHistory } }));

import { completeStep } from './loop';

describe('completeStep', () => {
  const taskId = new Types.ObjectId();
  const userA = new Types.ObjectId();
  const userB = new Types.ObjectId();
  const userC = new Types.ObjectId();
  let loop: any;

  beforeEach(() => {
    notifyFlowAdvanced.mockReset();
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
    expect(notifyFlowAdvanced).toHaveBeenCalledWith([userB], { _id: taskId }, undefined);

    expect(createHistory).toHaveBeenCalledWith(
      expect.objectContaining({ stepIndex: 0 })
    );

    notifyFlowAdvanced.mockClear();
    res = await completeStep(taskId.toString(), 1, userB.toString());
    expect(loop.sequence[1].status).toBe('COMPLETED');
    expect(loop.sequence[2].status).toBe('ACTIVE');
    expect(loop.currentStep).toBe(2);
    expect(notifyAssignment).toHaveBeenCalledWith([userC], { _id: taskId }, undefined);
    expect(notifyFlowAdvanced).toHaveBeenCalledWith([userC], { _id: taskId }, undefined);
    expect(createHistory).toHaveBeenCalledWith(
      expect.objectContaining({ stepIndex: 1 })
    );
    expect(createHistory).toHaveBeenCalledTimes(2);
  });
});

