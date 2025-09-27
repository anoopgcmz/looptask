import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Types } from 'mongoose';

vi.mock('@/lib/db', () => ({ default: vi.fn() }));

const auth = vi.hoisted(() => vi.fn());
vi.mock('@/lib/auth', () => ({ auth }));

const notifyAssignment = vi.hoisted(() => vi.fn());
const notifyLoopStepReady = vi.hoisted(() => vi.fn());
vi.mock('@/lib/notify', () => ({ notifyAssignment, notifyLoopStepReady }));

interface Task { _id: Types.ObjectId; organizationId: Types.ObjectId }
const findTaskById = vi.hoisted(() => vi.fn());
vi.mock('@/models/Task', () => ({ Task: { findById: findTaskById } }));

const findLoop = vi.hoisted(() => vi.fn());
vi.mock('@/models/TaskLoop', () => ({ TaskLoop: { findOne: findLoop } }));

const findUsers = vi.hoisted(() => vi.fn());
vi.mock('@/models/User', () => ({ User: { find: findUsers } }));

const createHistory = vi.hoisted(() => vi.fn());
vi.mock('@/models/LoopHistory', () => ({ LoopHistory: { create: createHistory } }));

vi.mock('@/lib/access', () => ({ canWriteTask: () => true }));

const startSession = vi.hoisted(() => vi.fn());
vi.mock('mongoose', async () => {
  const actual = (await vi.importActual<typeof import('mongoose')>('mongoose'));
  return { ...actual, startSession, models: actual.models };
});

const runWithOptionalTransaction = vi.hoisted(() =>
  vi.fn(async (_session, operation: (session: null) => Promise<void>) => {
    await operation(null);
  })
);
vi.mock('@/lib/transaction', () => ({ runWithOptionalTransaction }));

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
    findTaskById.mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        _id: taskId,
        organizationId: orgId,
        projectId: new Types.ObjectId(),
      }),
    });
    findUsers.mockReset();
    findUsers.mockReturnValue({
      lean: vi
        .fn()
        .mockResolvedValue([{ _id: newUser, organizationId: orgId }]),
    });

    loop = {
      taskId,
      sequence: [{ assignedTo: oldUser, status: 'COMPLETED', description: 'step' }],
      currentStep: 1,
      isActive: false,
      save: vi.fn().mockResolvedValue(null),
    };

    findLoop.mockReset();
    findLoop.mockImplementation(() => {
      const base = Promise.resolve(loop);
      const query = base as unknown as {
        lean: () => Promise<TestLoop>;
        session: () => unknown;
        then: Promise<TestLoop>['then'];
        catch: Promise<TestLoop>['catch'];
        finally: Promise<TestLoop>['finally'];
      };
      query.lean = async () => loop;
      query.session = () => query;
      query.then = base.then.bind(base);
      query.catch = base.catch.bind(base);
      query.finally = base.finally.bind(base);
      return query;
    });

    const withTransaction = vi.fn(async (fn: () => Promise<void>) => {
      await fn();
    });
    startSession.mockReset();
    startSession.mockResolvedValue({ withTransaction, endSession: vi.fn() });
    notifyAssignment.mockReset();
    notifyAssignment.mockResolvedValue(undefined);
    notifyLoopStepReady.mockReset();
    notifyLoopStepReady.mockResolvedValue(undefined);
    createHistory.mockReset();
    createHistory.mockResolvedValue(null);
  });

  it('updates assignee, resets status, and notifies users', async () => {
    const req = new Request('http://localhost', {
      method: 'PATCH',
      body: JSON.stringify({ sequence: [{ index: 0, assignedTo: newUser.toString() }] }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: taskId.toString() }) });
    expect(res.status).toBe(200);
    const first = loop.sequence[0];
    expect(first?.assignedTo).toEqual(newUser);
    expect(first?.status).toBe('PENDING');
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
