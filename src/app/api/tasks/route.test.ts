import { describe, expect, it, beforeEach, vi } from 'vitest';
import { Types } from 'mongoose';

const mockDbConnect = vi.hoisted(() => vi.fn());
vi.mock('@/lib/db', () => ({ default: mockDbConnect }));

const auth = vi.hoisted(() => vi.fn());
vi.mock('@/lib/auth', () => ({ auth }));

// Silence side-effect heavy modules that are unused in these tests
vi.mock('@/models/Task', () => ({ Task: { create: vi.fn() } }));
vi.mock('@/models/User', () => ({ User: { findOne: vi.fn() } }));
vi.mock('@/models/Project', () => ({ Project: { findOne: vi.fn() } }));
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

import { Task } from '@/models/Task';
import { User } from '@/models/User';
import { Project } from '@/models/Project';
import { computeParticipants } from '@/lib/taskParticipants';
import { prepareLoopFromSteps } from '@/lib/taskLoopSync';
import { ActivityLog } from '@/models/ActivityLog';
import { TaskLoop } from '@/models/TaskLoop';
import { LoopHistory } from '@/models/LoopHistory';
import { scheduleTaskJobs } from '@/lib/agenda';
import { notifyAssignment, notifyMention } from '@/lib/notify';
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
    (Task.create as unknown as ReturnType<typeof vi.fn>).mockReset();
    (User.findOne as unknown as ReturnType<typeof vi.fn>).mockReset();
    (Project.findOne as unknown as ReturnType<typeof vi.fn>).mockReset();
    (computeParticipants as unknown as ReturnType<typeof vi.fn>).mockReset();
    (prepareLoopFromSteps as unknown as ReturnType<typeof vi.fn>).mockReset();
    (ActivityLog.create as unknown as ReturnType<typeof vi.fn>).mockReset();
    (TaskLoop.create as unknown as ReturnType<typeof vi.fn>).mockReset();
    (LoopHistory.create as unknown as ReturnType<typeof vi.fn>).mockReset();
    (scheduleTaskJobs as unknown as ReturnType<typeof vi.fn>).mockReset();
    (notifyAssignment as unknown as ReturnType<typeof vi.fn>).mockReset();
    (notifyMention as unknown as ReturnType<typeof vi.fn>).mockReset();
    (computeParticipants as unknown as ReturnType<typeof vi.fn>).mockReturnValue([]);
    (prepareLoopFromSteps as unknown as ReturnType<typeof vi.fn>).mockReturnValue(null);
  });

  it('rejects a task with an empty title', async () => {
    const ownerId = new Types.ObjectId().toString();
    const projectId = new Types.ObjectId().toString();

    const res = await POST(
      new Request('http://localhost/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: '   ', ownerId, projectId }),
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
    const projectId = new Types.ObjectId().toString();

    const res = await POST(
      new Request('http://localhost/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Valid Title',
          ownerId,
          projectId,
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
    const projectId = new Types.ObjectId().toString();

    const res = await POST(
      new Request('http://localhost/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Valid Title',
          ownerId,
          projectId,
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

  it('rejects when projectId is missing', async () => {
    const ownerId = new Types.ObjectId().toString();

    const res = await POST(
      new Request('http://localhost/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Valid Title', ownerId }),
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

  it('rejects when the project is not in the organization', async () => {
    const ownerId = new Types.ObjectId().toString();
    const projectId = new Types.ObjectId().toString();

    (User.findOne as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ _id: ownerId });
    (Project.findOne as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await POST(
      new Request('http://localhost/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Valid Title', ownerId, projectId }),
      })
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual(
      expect.objectContaining({
        title: 'Invalid request',
        detail: 'Project must be in your organization',
      })
    );
    expect(mockDbConnect).toHaveBeenCalled();
  });

  it('creates a task with a valid project', async () => {
    const ownerId = new Types.ObjectId();
    const projectId = new Types.ObjectId();
    const organizationId = new Types.ObjectId();
    const userId = new Types.ObjectId();

    auth.mockResolvedValue({
      userId: userId.toString(),
      organizationId: organizationId.toString(),
      teamId: null,
    });

    const now = new Date();
    (User.findOne as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ _id: ownerId });
    (Project.findOne as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      _id: projectId,
      organizationId,
    });
    (Task.create as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      _id: new Types.ObjectId(),
      title: 'Valid Title',
      description: undefined,
      createdBy: userId,
      ownerId,
      helpers: [],
      mentions: [],
      organizationId,
      projectId,
      teamId: undefined,
      status: 'OPEN',
      priority: 'LOW',
      tags: [],
      visibility: 'PRIVATE',
      dueDate: undefined,
      steps: [],
      currentStepIndex: 0,
      participantIds: [],
      createdAt: now,
      updatedAt: now,
    });

    const res = await POST(
      new Request('http://localhost/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Valid Title',
          ownerId: ownerId.toString(),
          projectId: projectId.toString(),
        }),
      })
    );

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json).toEqual(
      expect.objectContaining({
        projectId: projectId.toString(),
        title: 'Valid Title',
      })
    );
    const createdPayload = (Task.create as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[0];
    expect(createdPayload.projectId?.toString()).toBe(projectId.toString());
    expect(mockDbConnect).toHaveBeenCalled();
  });
});
