import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './[id]/transition/route';

// mock mongoose before import
vi.mock('mongoose', async () => {
  const actual = await vi.importActual('mongoose');
  return {
    ...actual,
    startSession: vi.fn(async () => ({
      withTransaction: async (fn: unknown) => {
        await fn();
      },
    })),
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
}

const tasks = new Map<string, Task>();

vi.mock('@/models/Task', () => ({
  Task: {
    findById: vi.fn(async (id: string): Promise<Task | null> => {
      const doc = tasks.get(id);
      if (!doc) return null;
      doc.save = async function () {
        tasks.set(id, doc);
      };
      doc.session = function () {
        return doc;
      };
      return doc;
    }),
  },
}));

vi.mock('@/models/ActivityLog', () => ({
  ActivityLog: { create: vi.fn() },
}));

let currentUserId = '';
const orgId = new Types.ObjectId();
vi.mock('@/lib/auth', () => ({ auth: vi.fn(async () => ({ userId: currentUserId, organizationId: orgId.toString() })) }));

vi.mock('@/lib/ws', () => ({ emitTaskTransition: vi.fn() }));
vi.mock('@/lib/notify', () => ({
  notifyStatusChange: vi.fn(),
  notifyLoopStepReady: vi.fn(),
  notifyTaskClosed: vi.fn(),
  notifyAssignment: vi.fn(),
}));

const { Types } = mongoose;

describe('task flow with steps', () => {
  beforeEach(() => {
    tasks.clear();
    vi.clearAllMocks();
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
      status: 'FLOW_IN_PROGRESS',
      steps: [
        { title: 'Step 1', ownerId: u1, status: 'OPEN' },
        { title: 'Step 2', ownerId: u2, status: 'OPEN' },
        { title: 'Step 3', ownerId: u3, status: 'OPEN' },
      ],
      currentStepIndex: 0,
    });

    currentUserId = u1.toString();
    await POST(
      new Request('http://test', {
        method: 'POST',
        body: JSON.stringify({ action: 'DONE' }),
      }),
      { params: Promise.resolve({ id: taskId.toString() }) }
    );
    let t = tasks.get(taskId.toString());
    expect(t.currentStepIndex).toBe(1);
    expect(t.ownerId.toString()).toBe(u2.toString());
    expect(t.status).toBe('FLOW_IN_PROGRESS');
    expect(notifyAssignment).toHaveBeenCalledWith(
      [u2],
      expect.objectContaining({ _id: taskId }),
      'Step 2'
    );
    expect(notifyLoopStepReady).toHaveBeenCalledWith(
      [u2],
      expect.objectContaining({ _id: taskId }),
      'Step 2'
    );

    currentUserId = u2.toString();
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
    expect(t.status).toBe('FLOW_IN_PROGRESS');
    expect(notifyAssignment).toHaveBeenCalledWith(
      [u3],
      expect.objectContaining({ _id: taskId }),
      'Step 3'
    );
    expect(notifyLoopStepReady).toHaveBeenCalledWith(
      [u3],
      expect.objectContaining({ _id: taskId }),
      'Step 3'
    );

    currentUserId = u3.toString();
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
      status: 'FLOW_IN_PROGRESS',
      steps: [
        { title: 'Step 1', ownerId: u1, status: 'DONE' },
        { title: 'Step 2', ownerId: u2, status: 'OPEN' },
        { title: 'Step 3', ownerId: u3, status: 'DONE' },
      ],
      currentStepIndex: 1,
      participantIds: [u1, u2, u3],
    });

    currentUserId = u2.toString();
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
});

describe('simple task status transitions', () => {
  beforeEach(() => {
    tasks.clear();
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
});
