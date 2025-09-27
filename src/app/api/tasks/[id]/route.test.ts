import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Types } from 'mongoose';

const auth = vi.hoisted(() => vi.fn());
vi.mock('@/lib/auth', () => ({ auth }));

const mockDbConnect = vi.hoisted(() => vi.fn());
vi.mock('@/lib/db', () => ({ default: mockDbConnect }));

const canWriteTask = vi.hoisted(() => vi.fn());
vi.mock('@/lib/access', () => ({ canWriteTask }));

const findTaskById = vi.hoisted(() => vi.fn());
vi.mock('@/models/Task', () => ({ Task: { findById: findTaskById } }));

const findUser = vi.hoisted(() => vi.fn());
vi.mock('@/models/User', () => ({ User: { findOne: findUser } }));

const findProject = vi.hoisted(() => vi.fn());
vi.mock('@/models/Project', () => ({ Project: { findOne: findProject } }));

const computeParticipants = vi.hoisted(() => vi.fn());
vi.mock('@/lib/taskParticipants', () => ({ computeParticipants }));

const prepareLoopFromSteps = vi.hoisted(() => vi.fn());
vi.mock('@/lib/taskLoopSync', () => ({ prepareLoopFromSteps }));

const createActivity = vi.hoisted(() => vi.fn());
vi.mock('@/models/ActivityLog', () => ({ ActivityLog: { create: createActivity } }));

const taskLoopFindOne = vi.hoisted(() => vi.fn());
const taskLoopFindOneAndDelete = vi.hoisted(() => vi.fn());
const taskLoopCreate = vi.hoisted(() => vi.fn());
vi.mock('@/models/TaskLoop', () => ({
  TaskLoop: {
    findOne: taskLoopFindOne,
    findOneAndDelete: taskLoopFindOneAndDelete,
    create: taskLoopCreate,
  },
}));

const loopHistoryCreate = vi.hoisted(() => vi.fn());
const loopHistoryDeleteMany = vi.hoisted(() => vi.fn());
vi.mock('@/models/LoopHistory', () => ({
  LoopHistory: { create: loopHistoryCreate, deleteMany: loopHistoryDeleteMany },
}));

const scheduleTaskJobs = vi.hoisted(() => vi.fn());
vi.mock('@/lib/agenda', () => ({ scheduleTaskJobs }));

const emitTaskUpdated = vi.hoisted(() => vi.fn());
const emitLoopUpdated = vi.hoisted(() => vi.fn());
vi.mock('@/lib/ws', () => ({ emitTaskUpdated, emitLoopUpdated }));

const serializeTask = vi.hoisted(() => vi.fn());
vi.mock('@/lib/serializeTask', () => ({ serializeTask }));

import { PATCH } from './route';

describe('PATCH /tasks/:id project validation', () => {
  const sessionData = {
    userId: new Types.ObjectId().toString(),
    organizationId: new Types.ObjectId().toString(),
    teamId: null,
    role: 'ADMIN',
  };

  const taskId = new Types.ObjectId();
  const existingOwnerId = new Types.ObjectId();
  const newOwnerId = new Types.ObjectId();
  const projectId = new Types.ObjectId();

  let task: {
    _id: Types.ObjectId;
    ownerId: Types.ObjectId;
    projectId: Types.ObjectId;
    createdBy: Types.ObjectId;
    helpers: Types.ObjectId[];
    mentions: Types.ObjectId[];
    steps: unknown[];
    status: string;
    currentStepIndex: number;
    participantIds: Types.ObjectId[];
    updatedAt: Date;
    save: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    auth.mockResolvedValue(sessionData);
    mockDbConnect.mockResolvedValue(undefined);
    canWriteTask.mockReturnValue(true);

    task = {
      _id: taskId,
      ownerId: existingOwnerId,
      projectId,
      createdBy: new Types.ObjectId(),
      helpers: [],
      mentions: [],
      steps: [],
      status: 'OPEN',
      currentStepIndex: 0,
      participantIds: [],
      updatedAt: new Date(),
      save: vi.fn().mockResolvedValue(null),
    };

    findTaskById.mockResolvedValue(task);
    findUser.mockResolvedValue({ _id: newOwnerId });
    findProject.mockResolvedValue({ _id: projectId });
    computeParticipants.mockReturnValue([]);
    prepareLoopFromSteps.mockReturnValue(null);
    taskLoopFindOne.mockResolvedValue(null);
    taskLoopFindOneAndDelete.mockResolvedValue(null);
    taskLoopCreate.mockResolvedValue(null);
    loopHistoryCreate.mockResolvedValue(null);
    loopHistoryDeleteMany.mockResolvedValue(null);
    createActivity.mockResolvedValue(null);
    scheduleTaskJobs.mockResolvedValue(null);
    emitTaskUpdated.mockReturnValue(undefined);
    emitLoopUpdated.mockReturnValue(undefined);
    serializeTask.mockReturnValue({ _id: taskId.toString() });
  });

  it('reuses the existing project when updating the owner only', async () => {
    const req = new Request('http://localhost/api/tasks/' + taskId.toString(), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ownerId: newOwnerId.toString() }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: taskId.toString() }) });

    expect(res.status).toBe(200);
    expect(task.save).toHaveBeenCalledTimes(1);

    expect(task.ownerId.toString()).toBe(newOwnerId.toString());
    expect(task.projectId.toString()).toBe(projectId.toString());

    expect(findProject).toHaveBeenCalledTimes(1);
    const projectQuery = (findProject as unknown as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(projectQuery?._id?.toString()).toBe(projectId.toString());
    expect(projectQuery?.organizationId?.toString()).toBe(sessionData.organizationId);

    expect(serializeTask).toHaveBeenCalledWith(task);
    const responseBody = await res.json();
    expect(responseBody).toEqual({ _id: taskId.toString() });
  });
});
