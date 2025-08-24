import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './[id]/transition/route';

// mock mongoose before import
vi.mock('mongoose', async () => {
  const actual = await vi.importActual<typeof import('mongoose')>('mongoose');
  return {
    ...actual,
    startSession: vi.fn(async () => ({
      withTransaction: async (fn: any) => {
        await fn();
      },
    })),
  };
});
import mongoose from 'mongoose';

// mocks
vi.mock('@/lib/db', () => ({ default: vi.fn() }));

const tasks = new Map<string, any>();

vi.mock('@/models/Task', () => ({
  default: {
    findById: vi.fn(async (id: string) => {
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
  default: { create: vi.fn() },
}));

let currentUserId = '';
vi.mock('@/lib/auth', () => ({ auth: vi.fn(async () => ({ userId: currentUserId })) }));

vi.mock('@/lib/ws', () => ({ emitTaskTransition: vi.fn() }));
vi.mock('@/lib/notify', () => ({
  notifyStatusChange: vi.fn(),
  notifyFlowAdvanced: vi.fn(),
  notifyTaskClosed: vi.fn(),
}));

const { Types } = mongoose;

describe('task flow with steps', () => {
  beforeEach(() => {
    tasks.clear();
  });

  it('advances through steps and completes', async () => {
    const u1 = new Types.ObjectId();
    const u2 = new Types.ObjectId();
    const u3 = new Types.ObjectId();
    const taskId = new Types.ObjectId();
    tasks.set(taskId.toString(), {
      _id: taskId,
      title: 'Test',
      creatorId: u1,
      ownerId: u1,
      status: 'FLOW_IN_PROGRESS',
      steps: [
        { ownerId: u1, status: 'OPEN' },
        { ownerId: u2, status: 'OPEN' },
        { ownerId: u3, status: 'OPEN' },
      ],
      currentStepIndex: 0,
    });

    currentUserId = u1.toString();
    await POST(
      new Request('http://test', {
        method: 'POST',
        body: JSON.stringify({ action: 'DONE' }),
      }),
      { params: { id: taskId.toString() } }
    );
    let t = tasks.get(taskId.toString());
    expect(t.currentStepIndex).toBe(1);
    expect(t.ownerId.toString()).toBe(u2.toString());
    expect(t.status).toBe('FLOW_IN_PROGRESS');

    currentUserId = u2.toString();
    await POST(
      new Request('http://test', {
        method: 'POST',
        body: JSON.stringify({ action: 'DONE' }),
      }),
      { params: { id: taskId.toString() } }
    );
    t = tasks.get(taskId.toString());
    expect(t.currentStepIndex).toBe(2);
    expect(t.ownerId.toString()).toBe(u3.toString());
    expect(t.status).toBe('FLOW_IN_PROGRESS');

    currentUserId = u3.toString();
    await POST(
      new Request('http://test', {
        method: 'POST',
        body: JSON.stringify({ action: 'DONE' }),
      }),
      { params: { id: taskId.toString() } }
    );
    t = tasks.get(taskId.toString());
    expect(t.status).toBe('DONE');
    expect(t.currentStepIndex).toBe(2);
  });
});
