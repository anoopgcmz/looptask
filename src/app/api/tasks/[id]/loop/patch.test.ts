import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Types } from 'mongoose';

vi.mock('@/lib/db', () => ({ default: vi.fn() }));

const auth = vi.fn();
vi.mock('@/lib/auth', () => ({ auth }));

const notifyAssignment = vi.fn();
const notifyLoopStepReady = vi.fn();
vi.mock('@/lib/notify', () => ({ notifyAssignment, notifyLoopStepReady }));

interface Task { _id: Types.ObjectId; organizationId: Types.ObjectId }
const findTaskById = vi.fn<[string], Promise<Task | null>>();
vi.mock('@/models/Task', () => ({ default: { findById: findTaskById } }));

const findLoop = vi.fn();
vi.mock('@/models/TaskLoop', () => ({ default: { findOne: findLoop } }));

const findUsers = vi.fn();
vi.mock('@/models/User', () => ({ default: { find: findUsers } }));

vi.mock('@/lib/access', () => ({ canWriteTask: () => true }));

const startSession = vi.fn();
vi.mock('mongoose', async () => {
  const actual = await vi.importActual<typeof import('mongoose')>('mongoose');
  return { ...actual, startSession };
});

import { PATCH } from './route';

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
}

describe('PATCH /tasks/:id/loop assignedTo updates', () => {
  const taskId = new Types.ObjectId();
  const oldUser = new Types.ObjectId();
  const newUser = new Types.ObjectId();
  const orgId = new Types.ObjectId();
  const sessionData = {
    userId: new Types.ObjectId().toString(),
    teamId: null,
    organizationId: orgId.toString(),
  };

  let loop: TestLoop;

  beforeEach(() => {
    auth.mockResolvedValue(sessionData);
    findTaskById.mockReset();
    findTaskById.mockResolvedValue({ _id: taskId, organizationId: orgId });
    findUsers.mockReset();
    findUsers.mockResolvedValue([{ _id: newUser, organizationId: orgId }]);

    loop = {
      taskId,
      sequence: [{ assignedTo: oldUser, status: 'COMPLETED', description: 'step' }],
      currentStep: 1,
      isActive: false,
      save: vi.fn().mockResolvedValue(null),
    };

    findLoop.mockReset();
    findLoop.mockReturnValue({
      session: vi.fn().mockReturnThis(),
      then: (resolve: (l: TestLoop) => void) => resolve(loop),
    });

    const withTransaction = vi.fn(async (fn: () => Promise<void>) => {
      await fn();
    });
    startSession.mockReset();
    startSession.mockResolvedValue({ withTransaction, endSession: vi.fn() });
    notifyAssignment.mockReset();
    notifyLoopStepReady.mockReset();
  });

  it('updates assignee, resets status, and notifies users', async () => {
    const req = new Request('http://localhost', {
      method: 'PATCH',
      body: JSON.stringify({ sequence: [{ index: 0, assignedTo: newUser.toString() }] }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await PATCH(req, { params: { id: taskId.toString() } });
    expect(res.status).toBe(200);
    expect(loop.sequence[0].assignedTo).toEqual(newUser);
    expect(loop.sequence[0].status).toBe('PENDING');
    expect(loop.currentStep).toBe(0);
    expect(loop.isActive).toBe(true);
    expect(notifyAssignment).toHaveBeenCalledTimes(2);
    expect(notifyAssignment).toHaveBeenCalledWith(
      [newUser],
      { _id: taskId, organizationId: orgId },
      'step'
    );
    expect(notifyAssignment).toHaveBeenCalledWith(
      [oldUser],
      { _id: taskId, organizationId: orgId },
      'step'
    );
    expect(notifyLoopStepReady).toHaveBeenCalledWith(
      [newUser],
      { _id: taskId, organizationId: orgId },
      'step'
    );
  });
});
