import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './[id]/transition/route';

const startSessionMock = vi.hoisted(
  () =>
    vi.fn(async () => ({
      withTransaction: async (fn: unknown) => {
        await (fn as () => Promise<void>)();
      },
      endSession: vi.fn(),
    }))
) as ReturnType<typeof vi.fn>;

// mock mongoose before import
vi.mock('mongoose', async () => {
  const actual = await vi.importActual('mongoose');
  return {
    ...actual,
    startSession: startSessionMock,
  };
});
import mongoose from 'mongoose';
import { notifyTaskClosed, notifyLoopStepReady, notifyAssignment } from '@/lib/notify';

// mocks
vi.mock('@/lib/db', () => ({ default: vi.fn() }));

interface Task {
  _id: mongoose.Types.ObjectId;
  title: string;
  createdBy: mongoose.Types.ObjectId;
  ownerId: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  status: string;
  steps: { title: string; ownerId: mongoose.Types.ObjectId; status: string }[];
  currentStepIndex: number;
  participantIds?: mongoose.Types.ObjectId[];
  save?: () => Promise<void>;
  session?: () => Task;
  createdAt: Date;
  updatedAt: Date;
}

const tasks = new Map<string, Task>();

vi.mock('@/models/Task', () => ({
  deriveTaskStatusFromSteps: (steps: Task['steps']) => {
    if (!steps || !steps.length) return 'OPEN';
    if (steps.every((step) => step.status === 'DONE')) return 'DONE';
    return steps.some((step) => step.status !== 'OPEN') ? 'IN_PROGRESS' : 'OPEN';
  },
  resolveCurrentStepIndex: (steps: Task['steps']) => {
    if (!steps || !steps.length) return 0;
    const idx = steps.findIndex((step) => step.status !== 'DONE');
    return idx === -1 ? steps.length - 1 : idx;
  },
  Task: {
    findById: vi.fn((id: string | mongoose.Types.ObjectId) => {
      const key = typeof id === 'string' ? id : id.toString();
      const doc = tasks.get(key);
      if (!doc) {
        return {
          lean: vi.fn(async () => null),
          session: vi.fn(() => null),
          then: (resolve: (value: Task | null) => void) => resolve(null),
        };
      }
      doc.save = async function () {
        tasks.set(key, doc);
      };
      doc.session = function () {
        return doc;
      };
      doc.toObject = function () {
        return { ...doc };
      };
      return {
        lean: vi.fn(async () => doc),
        session: vi.fn(() => doc),
        then: (resolve: (value: Task) => void) => resolve(doc),
      };
    }),
  },
}));

vi.mock('@/models/ActivityLog', () => ({
  ActivityLog: { create: vi.fn() },
}));

let currentUserId = '';
const { Types } = mongoose;
const orgId = new Types.ObjectId();
vi.mock('@/lib/auth', () => ({ auth: vi.fn(async () => ({ userId: currentUserId, organizationId: orgId.toString() })) }));

vi.mock('@/lib/ws', () => ({ emitTaskTransition: vi.fn() }));
const completeStepMock = vi.hoisted(() => vi.fn(async () => null));
vi.mock('@/lib/notify', () => ({
  notifyStatusChange: vi.fn(),
  notifyLoopStepReady: vi.fn(),
  notifyTaskClosed: vi.fn(),
  notifyAssignment: vi.fn(),
}));
vi.mock('@/lib/loop', () => ({ default: { completeStep: completeStepMock } }));

describe('task flow with steps', () => {
  beforeEach(() => {
    tasks.clear();
    vi.clearAllMocks();
    completeStepMock.mockReset();
    completeStepMock.mockResolvedValue(null);
  });

  it('advances through steps and completes', async () => {
    const u1 = new Types.ObjectId();
    const u2 = new Types.ObjectId();
    const u3 = new Types.ObjectId();
    const taskId = new Types.ObjectId();
    tasks.set(taskId.toString(), {
      _id: taskId,
      title: 'Test',
      createdBy: u1,
      ownerId: u1,
      organizationId: orgId,
      status: 'OPEN',
      steps: [
        { title: 'Step 1', ownerId: u1, status: 'OPEN' },
        { title: 'Step 2', ownerId: u2, status: 'OPEN' },
        { title: 'Step 3', ownerId: u3, status: 'OPEN' },
      ],
      currentStepIndex: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    completeStepMock.mockResolvedValue({
      sequence: [],
      currentStep: 1,
      isActive: true,
      updatedAt: new Date(),
    } as unknown as Record<string, unknown>);

    currentUserId = u1.toString();
    await POST(
      new Request('http://test', {
        method: 'POST',
        body: JSON.stringify({ action: 'START' }),
      }),
      { params: Promise.resolve({ id: taskId.toString() }) }
    );
    let t = tasks.get(taskId.toString());
    expect(t.currentStepIndex).toBe(0);
    expect(t.ownerId.toString()).toBe(u1.toString());
    expect(t.status).toBe('IN_PROGRESS');
    expect(completeStepMock).not.toHaveBeenCalled();

    await POST(
      new Request('http://test', {
        method: 'POST',
        body: JSON.stringify({ action: 'DONE' }),
      }),
      { params: Promise.resolve({ id: taskId.toString() }) }
    );
    t = tasks.get(taskId.toString());
    expect(t.currentStepIndex).toBe(1);
    expect(t.ownerId.toString()).toBe(u2.toString());
    expect(t.status).toBe('IN_PROGRESS');
    expect(completeStepMock).toHaveBeenLastCalledWith(
      taskId.toString(),
      0,
      u1.toString()
    );

    currentUserId = u2.toString();
    await POST(
      new Request('http://test', {
        method: 'POST',
        body: JSON.stringify({ action: 'START' }),
      }),
      { params: Promise.resolve({ id: taskId.toString() }) }
    );
    t = tasks.get(taskId.toString());
    expect(t.currentStepIndex).toBe(1);
    expect(t.ownerId.toString()).toBe(u2.toString());
    expect(t.status).toBe('IN_PROGRESS');

    await POST(
      new Request('http://test', {
        method: 'POST',
        body: JSON.stringify({ action: 'DONE' }),
      }),
      { params: Promise.resolve({ id: taskId.toString() }) }
    );
    t = tasks.get(taskId.toString());
    expect(t.currentStepIndex).toBe(2);
    expect(t.ownerId.toString()).toBe(u3.toString());
    expect(t.status).toBe('IN_PROGRESS');
    expect(completeStepMock).toHaveBeenLastCalledWith(
      taskId.toString(),
      1,
      u2.toString()
    );

    currentUserId = u3.toString();
    await POST(
      new Request('http://test', {
        method: 'POST',
        body: JSON.stringify({ action: 'START' }),
      }),
      { params: Promise.resolve({ id: taskId.toString() }) }
    );
    t = tasks.get(taskId.toString());
    expect(t.currentStepIndex).toBe(2);
    expect(t.ownerId.toString()).toBe(u3.toString());
    expect(t.status).toBe('IN_PROGRESS');

    await POST(
      new Request('http://test', {
        method: 'POST',
        body: JSON.stringify({ action: 'DONE' }),
      }),
      { params: Promise.resolve({ id: taskId.toString() }) }
    );
    t = tasks.get(taskId.toString());
    expect(t.status).toBe('DONE');
    expect(t.currentStepIndex).toBe(2);
    expect(completeStepMock).toHaveBeenLastCalledWith(
      taskId.toString(),
      2,
      u3.toString()
    );
    expect(notifyAssignment).not.toHaveBeenCalled();
    expect(notifyLoopStepReady).not.toHaveBeenCalled();
  });

  it('completes task when last open step finishes and notifies', async () => {
    const u1 = new Types.ObjectId();
    const u2 = new Types.ObjectId();
    const u3 = new Types.ObjectId();
    const taskId = new Types.ObjectId();
    tasks.set(taskId.toString(), {
      _id: taskId,
      title: 'Test',
      createdBy: u1,
      ownerId: u2,
      organizationId: orgId,
      status: 'IN_PROGRESS',
      steps: [
        { title: 'Step 1', ownerId: u1, status: 'DONE' },
        { title: 'Step 2', ownerId: u2, status: 'OPEN' },
        { title: 'Step 3', ownerId: u3, status: 'DONE' },
      ],
      currentStepIndex: 1,
      participantIds: [u1, u2, u3],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    currentUserId = u2.toString();
    await POST(
      new Request('http://test', {
        method: 'POST',
        body: JSON.stringify({ action: 'START' }),
      }),
      { params: Promise.resolve({ id: taskId.toString() }) }
    );

    await POST(
      new Request('http://test', {
        method: 'POST',
        body: JSON.stringify({ action: 'DONE' }),
      }),
      { params: Promise.resolve({ id: taskId.toString() }) }
    );

    const t = tasks.get(taskId.toString());
    expect(t.status).toBe('DONE');
    expect(notifyTaskClosed).toHaveBeenCalledTimes(1);
  });

  it('returns conflict when completing an already done step', async () => {
    const u1 = new Types.ObjectId();
    const taskId = new Types.ObjectId();
    tasks.set(taskId.toString(), {
      _id: taskId,
      title: 'Test',
      createdBy: u1,
      ownerId: u1,
      organizationId: orgId,
      status: 'DONE',
      steps: [{ title: 'Step 1', ownerId: u1, status: 'DONE' }],
      currentStepIndex: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    currentUserId = u1.toString();
    const res = await POST(
      new Request('http://test', {
        method: 'POST',
        body: JSON.stringify({ action: 'DONE' }),
      }),
      { params: Promise.resolve({ id: taskId.toString() }) }
    );

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual(
      expect.objectContaining({ detail: 'Step already completed' })
    );
  });
});

describe('simple task status transitions', () => {
  beforeEach(() => {
    tasks.clear();
    vi.clearAllMocks();
  });

  it('transitions from OPEN to DONE', async () => {
    const u1 = new Types.ObjectId();
    const taskId = new Types.ObjectId();
    tasks.set(taskId.toString(), {
      _id: taskId,
      title: 'Test',
      createdBy: u1,
      ownerId: u1,
      organizationId: orgId,
      status: 'OPEN',
      steps: [],
      currentStepIndex: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    currentUserId = u1.toString();
    await POST(
      new Request('http://test', {
        method: 'POST',
        body: JSON.stringify({ action: 'START' }),
      }),
      { params: Promise.resolve({ id: taskId.toString() }) }
    );
    let t = tasks.get(taskId.toString());
    expect(t.status).toBe('IN_PROGRESS');

    await POST(
      new Request('http://test', {
        method: 'POST',
        body: JSON.stringify({ action: 'SEND_FOR_REVIEW' }),
      }),
      { params: Promise.resolve({ id: taskId.toString() }) }
    );
    t = tasks.get(taskId.toString());
    expect(t.status).toBe('IN_REVIEW');

    await POST(
      new Request('http://test', {
        method: 'POST',
        body: JSON.stringify({ action: 'DONE' }),
      }),
      { params: Promise.resolve({ id: taskId.toString() }) }
    );
    t = tasks.get(taskId.toString());
    expect(t.status).toBe('DONE');
  });

  it('falls back when transactions unsupported', async () => {
    const u1 = new Types.ObjectId();
    const taskId = new Types.ObjectId();
    tasks.set(taskId.toString(), {
      _id: taskId,
      title: 'Test',
      createdBy: u1,
      ownerId: u1,
      organizationId: orgId,
      status: 'OPEN',
      steps: [],
      currentStepIndex: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const error = {
      message: 'Transaction numbers are only allowed on a replica set member or mongos',
      code: 303,
    };
    const withTransaction = vi.fn(async () => {
      throw error;
    });
    const endSession = vi.fn();
    startSessionMock.mockResolvedValueOnce({
      withTransaction,
      endSession,
    });

    currentUserId = u1.toString();
    const res = await POST(
      new Request('http://test', {
        method: 'POST',
        body: JSON.stringify({ action: 'START' }),
      }),
      { params: Promise.resolve({ id: taskId.toString() }) }
    );

    const t = tasks.get(taskId.toString());
    expect(t.status).toBe('IN_PROGRESS');
    expect(withTransaction).toHaveBeenCalled();
    expect(endSession).toHaveBeenCalled();
    expect(res.status).toBe(200);
  });

  it('falls back when transactions unsupported via codeName', async () => {
    const u1 = new Types.ObjectId();
    const taskId = new Types.ObjectId();
    tasks.set(taskId.toString(), {
      _id: taskId,
      title: 'Test',
      createdBy: u1,
      ownerId: u1,
      organizationId: orgId,
      status: 'OPEN',
      steps: [],
      currentStepIndex: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const error = {
      message: 'Cannot start transaction on standalone',
      code: 20,
      codeName: 'IllegalOperation',
    };
    const withTransaction = vi.fn(async () => {
      throw error;
    });
    const endSession = vi.fn();
    startSessionMock.mockResolvedValueOnce({
      withTransaction,
      endSession,
    });

    currentUserId = u1.toString();
    const res = await POST(
      new Request('http://test', {
        method: 'POST',
        body: JSON.stringify({ action: 'START' }),
      }),
      { params: Promise.resolve({ id: taskId.toString() }) }
    );

    const t = tasks.get(taskId.toString());
    expect(t.status).toBe('IN_PROGRESS');
    expect(withTransaction).toHaveBeenCalled();
    expect(endSession).toHaveBeenCalled();
    expect(res.status).toBe(200);
  });
});
