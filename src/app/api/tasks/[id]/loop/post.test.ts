import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Types } from 'mongoose';

const mockDb = vi.hoisted(() => vi.fn());
vi.mock('@/lib/db', () => ({ default: mockDb }));

const auth = vi.hoisted(() => vi.fn());
vi.mock('@/lib/auth', () => ({ auth }));

const findTaskById = vi.hoisted(() => vi.fn());
vi.mock('@/models/Task', () => ({ Task: { findById: findTaskById } }));

const createLoop = vi.hoisted(() => vi.fn());
vi.mock('@/models/TaskLoop', () => ({ TaskLoop: { create: createLoop } }));

const createHistory = vi.hoisted(() => vi.fn());
vi.mock('@/models/LoopHistory', () => ({ LoopHistory: { create: createHistory } }));

const findUsers = vi.hoisted(() => vi.fn());
vi.mock('@/models/User', () => ({ User: { find: findUsers } }));

vi.mock('@/lib/access', () => ({ canWriteTask: () => true }));

const emitLoopUpdated = vi.hoisted(() => vi.fn());
vi.mock('@/lib/ws', () => ({ emitLoopUpdated }));

import { POST } from './route';

describe('POST /tasks/:id/loop', () => {
  const taskId = new Types.ObjectId();
  const orgId = new Types.ObjectId();
  const userA = new Types.ObjectId();
  const userB = new Types.ObjectId();

  beforeEach(() => {
    auth.mockReset();
    auth.mockResolvedValue({
      userId: new Types.ObjectId().toString(),
      teamId: null,
      organizationId: orgId.toString(),
    });
    findTaskById.mockReset();
    findTaskById.mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        _id: taskId,
        organizationId: orgId,
        teamId: null,
      }),
    });
    findUsers.mockReset();
    findUsers.mockReturnValue({
      lean: vi
        .fn()
        .mockResolvedValue([
          { _id: userA, organizationId: orgId },
          { _id: userB, organizationId: orgId },
        ]),
    });
    createLoop.mockReset();
    createLoop.mockResolvedValue({
      taskId,
      sequence: [],
      updatedAt: new Date(),
    });
    createHistory.mockReset();
    createHistory.mockResolvedValue(null);
    emitLoopUpdated.mockReset();
  });

  it('creates a loop with dependency indexes', async () => {
    const req = new Request('http://localhost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sequence: [
          {
            assignedTo: userA.toString(),
            description: 'First step',
          },
          {
            assignedTo: userB.toString(),
            description: 'Second step',
            dependencies: [0],
          },
        ],
      }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: taskId.toString() }) });

    expect(res.status).toBe(200);
    const [createArg] = createLoop.mock.calls[0] ?? [];
    expect(createArg.sequence).toHaveLength(2);
    expect(createArg.sequence[0]?.dependencies).toEqual([]);
    expect(createArg.sequence[1]?.dependencies).toEqual([0]);
    expect(createArg.sequence[0]?.assignedTo.equals(userA)).toBe(true);
    expect(createArg.sequence[1]?.assignedTo.equals(userB)).toBe(true);
    expect(createHistory).toHaveBeenCalledWith([
      expect.objectContaining({ stepIndex: 0 }),
      expect.objectContaining({ stepIndex: 1 }),
    ]);
    expect(emitLoopUpdated).toHaveBeenCalled();
  });

  it('rejects invalid dependency indexes', async () => {
    const req = new Request('http://localhost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sequence: [
          {
            assignedTo: userA.toString(),
            description: 'Only step',
            dependencies: [5],
          },
        ],
      }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: taskId.toString() }) });
    expect(res.status).toBe(400);
  });
});
