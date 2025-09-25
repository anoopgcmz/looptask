import { describe, expect, it, beforeEach, vi } from 'vitest';
import { Types } from 'mongoose';

const mockDbConnect = vi.hoisted(() => vi.fn());
vi.mock('@/lib/db', () => ({ default: mockDbConnect }));

const auth = vi.hoisted(() => vi.fn());
vi.mock('@/lib/auth', () => ({ auth }));

// Silence side-effect heavy modules that are unused in these tests
vi.mock('@/models/Task', () => ({ Task: { create: vi.fn() } }));
vi.mock('@/models/User', () => ({ User: { findOne: vi.fn() } }));
vi.mock('@/models/ActivityLog', () => ({ ActivityLog: { create: vi.fn() } }));
vi.mock('@/models/TaskLoop', () => ({ TaskLoop: { create: vi.fn() } }));
vi.mock('@/models/LoopHistory', () => ({ LoopHistory: { create: vi.fn() } }));
vi.mock('@/lib/notify', () => ({
  notifyAssignment: vi.fn(),
  notifyMention: vi.fn(),
}));
vi.mock('@/lib/agenda', () => ({ scheduleTaskJobs: vi.fn() }));
vi.mock('@/lib/taskParticipants', () => ({ computeParticipants: vi.fn() }));
vi.mock('@/lib/taskLoopSync', () => ({ prepareLoopFromSteps: vi.fn() }));
vi.mock('@/lib/ws', () => ({ emitLoopUpdated: vi.fn() }));

import { POST } from './route';

describe('POST /tasks validation', () => {
  beforeEach(() => {
    auth.mockReset();
    auth.mockResolvedValue({
      userId: new Types.ObjectId().toString(),
      organizationId: new Types.ObjectId().toString(),
      teamId: null,
    });
    mockDbConnect.mockReset();
  });

  it('rejects a task with an empty title', async () => {
    const ownerId = new Types.ObjectId().toString();

    const res = await POST(
      new Request('http://localhost/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: '   ', ownerId }),
      })
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual(
      expect.objectContaining({
        title: 'Invalid request',
      })
    );
    expect(mockDbConnect).not.toHaveBeenCalled();
  });

  it('rejects a task when a step has an empty title', async () => {
    const ownerId = new Types.ObjectId().toString();

    const res = await POST(
      new Request('http://localhost/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Valid Title',
          ownerId,
          steps: [
            {
              title: '   ',
              ownerId,
            },
          ],
        }),
      })
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual(
      expect.objectContaining({
        title: 'Invalid request',
      })
    );
    expect(mockDbConnect).not.toHaveBeenCalled();
  });

  it('rejects a task when a step due date is before an earlier step', async () => {
    const ownerId = new Types.ObjectId().toString();

    const res = await POST(
      new Request('http://localhost/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Valid Title',
          ownerId,
          steps: [
            {
              title: 'Step 1',
              ownerId,
              dueAt: '2025-12-06T00:00:00.000Z',
            },
            {
              title: 'Step 2',
              ownerId,
              dueAt: '2025-12-05T00:00:00.000Z',
            },
          ],
        }),
      })
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual(
      expect.objectContaining({
        title: 'Invalid request',
        detail: 'Step "Step 2" due date must not be before step "Step 1" due date',
      })
    );
    expect(mockDbConnect).not.toHaveBeenCalled();
  });
});
