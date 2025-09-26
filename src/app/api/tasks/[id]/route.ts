import { NextResponse, type NextRequest } from 'next/server';
import type { Session } from 'next-auth';
import { z } from 'zod';
import { Types } from 'mongoose';
import dbConnect from '@/lib/db';
import { Task, deriveTaskStatusFromSteps, resolveCurrentStepIndex } from '@/models/Task';
import type { ITask } from '@/models/Task';
import { ActivityLog } from '@/models/ActivityLog';
import { User } from '@/models/User';
import { TaskLoop } from '@/models/TaskLoop';
import { LoopHistory } from '@/models/LoopHistory';
import { canReadTask, canWriteTask } from '@/lib/access';
import { scheduleTaskJobs } from '@/lib/agenda';
import { emitTaskUpdated, emitLoopUpdated } from '@/lib/ws';
import { diff } from '@/lib/diff';
import { problem } from '@/lib/http';
import { computeParticipants } from '@/lib/taskParticipants';
import { withOrganization } from '@/lib/middleware/withOrganization';
import type {
  TaskPayload,
  TaskResponse,
} from '@/types/api/task';
import { stepSchema } from '@/lib/schemas/taskStep';
import { serializeTask } from '@/lib/serializeTask';
import { prepareLoopFromSteps } from '@/lib/taskLoopSync';
import { assertSequentialTaskStepDueDates } from '@/lib/validateStepDueDates';

const patchSchema: z.ZodType<Partial<TaskPayload>> = z
  .object({
    title: z.string().optional(),
    description: z.string().optional(),
    ownerId: z.string().optional(),
    helpers: z.array(z.string()).optional(),
    mentions: z.array(z.string()).optional(),
    teamId: z.string().optional(),
    status: z
      .enum(['OPEN', 'IN_PROGRESS', 'IN_REVIEW', 'REVISIONS', 'FLOW_IN_PROGRESS', 'DONE'])
      .optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
    tags: z.array(z.string()).optional(),
    visibility: z.enum(['PRIVATE', 'TEAM']).optional(),
    dueDate: z.coerce.date().optional(),
    steps: z.array(stepSchema).optional(),
    currentStepIndex: z.number().int().optional(),
  });

export const runtime = 'nodejs';

const putSchema: z.ZodType<TaskPayload> = z
  .object({
    title: z.string(),
    description: z.string().optional(),
    ownerId: z.string(),
    helpers: z.array(z.string()),
    mentions: z.array(z.string()),
    teamId: z.string().optional(),
    status: z.enum([
      'OPEN',
      'IN_PROGRESS',
      'IN_REVIEW',
      'REVISIONS',
      'FLOW_IN_PROGRESS',
      'DONE',
    ]),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH']),
    tags: z.array(z.string()),
    visibility: z.enum(['PRIVATE', 'TEAM']),
    dueDate: z.coerce.date().optional(),
    steps: z.array(stepSchema),
    currentStepIndex: z.number().int().optional(),
  });

export const GET = withOrganization(
  async (
    req: NextRequest,
    context: { params: Promise<{ id: string }> },
    session: Session
  ) => {
  const { params } = context;
  const { id } = await params;
  await dbConnect();
  const task: ITask | null = await Task.findById(id);
  if (
    !task ||
    !canReadTask(
      {
        _id: session.userId,
        teamId: session.teamId,
        organizationId: session.organizationId,
        role: session.role,
      },
      task
    )
  ) {
    return problem(404, 'Not Found', 'Task not found');
  }
  return NextResponse.json<TaskResponse>(serializeTask(task));
});

export const PATCH = withOrganization(
  async (
    req: NextRequest,
    context: { params: Promise<{ id: string }> },
    session: Session
  ) => {
  let body: Partial<TaskPayload>;
  try {
    body = patchSchema.parse(await req.json());
  } catch (e: unknown) {
    const err = e as Error;
    return problem(400, 'Invalid request', err.message);
  }
  if (body.steps) {
    try {
      assertSequentialTaskStepDueDates(body.steps);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid step due dates';
      return problem(400, 'Invalid request', message);
    }
  }
  const { params } = context;
  const { id } = await params;
  await dbConnect();
  const task: ITask | null = await Task.findById(id);
  if (!task) return problem(404, 'Not Found', 'Task not found');
  if (
    !canWriteTask(
      {
        _id: session.userId,
        teamId: session.teamId,
        organizationId: session.organizationId,
        role: session.role,
      },
      task
    )
  )
    return problem(403, 'Forbidden', 'You cannot edit this task');
  if (body.ownerId) {
    const owner = await User.findOne({
      _id: new Types.ObjectId(body.ownerId),
      organizationId: new Types.ObjectId(task.organizationId),
    });
    if (!owner) {
      return problem(400, 'Invalid request', 'Owner must be in your organization');
    }
  }
  if (body.steps) {
    for (const s of body.steps) {
      const stepOwner = await User.findOne({
        _id: new Types.ObjectId(s.ownerId),
        organizationId: new Types.ObjectId(task.organizationId),
      });
      if (!stepOwner) {
        return problem(400, 'Invalid request', 'Step owner must be in your organization');
      }
    }
  }
  Object.assign(task, {
    ...body,
    ownerId: body.ownerId ? new Types.ObjectId(body.ownerId) : task.ownerId,
    helpers: body.helpers?.map((id) => new Types.ObjectId(id)) ?? task.helpers,
    mentions: body.mentions?.map((id) => new Types.ObjectId(id)) ?? task.mentions,
    teamId: body.teamId ? new Types.ObjectId(body.teamId) : task.teamId,
    steps: body.steps
      ? body.steps.map((s) => ({
          title: s.title,
          ownerId: new Types.ObjectId(s.ownerId),
          description: s.description,
          dueAt: s.dueAt,
          status: s.status ?? 'OPEN',
          completedAt: s.completedAt,
        }))
      : task.steps,
  });
  if (Array.isArray(task.steps) && task.steps.length) {
    const stepIndex = resolveCurrentStepIndex(task.steps);
    task.currentStepIndex = stepIndex;
    task.status = deriveTaskStatusFromSteps(task.steps);
    const activeStep = task.steps[stepIndex] ?? task.steps[task.steps.length - 1];
    if (activeStep) {
      task.ownerId = activeStep.ownerId;
    }
  }
  task.participantIds = computeParticipants({
    createdBy: task.createdBy,
    ownerId: task.ownerId,
    helpers: task.helpers,
    mentions: task.mentions,
    steps: task.steps,
  });
  await task.save();
  const loopData = prepareLoopFromSteps(
    task._id,
    task.steps,
    task.currentStepIndex,
    task.status
  );
  let loopPayload: object | null = null;
  if (loopData) {
    const existingLoop = await TaskLoop.findOne({ taskId: task._id });
    if (existingLoop) {
      existingLoop.set({
        sequence: loopData.sequence,
        currentStep: loopData.currentStep,
        isActive: loopData.isActive,
        parallel: false,
      });
      await existingLoop.save();
      loopPayload =
        typeof (existingLoop as unknown as { toObject?: () => unknown }).toObject === 'function'
          ? ((existingLoop as unknown as { toObject: () => unknown }).toObject() as object)
          : (existingLoop as unknown as object);
    } else {
      const createdLoop = await TaskLoop.create({
        taskId: task._id,
        sequence: loopData.sequence,
        currentStep: loopData.currentStep,
        isActive: loopData.isActive,
        parallel: false,
      });
      await LoopHistory.create(
        loopData.sequence.map((_, idx) => ({
          taskId: createdLoop.taskId,
          stepIndex: idx,
          action: 'CREATE',
          userId: new Types.ObjectId(session.userId),
        }))
      );
      loopPayload =
        typeof (createdLoop as unknown as { toObject?: () => unknown }).toObject === 'function'
          ? ((createdLoop as unknown as { toObject: () => unknown }).toObject() as object)
          : (createdLoop as unknown as object);
    }
  } else {
    await TaskLoop.findOneAndDelete({ taskId: task._id });
    await LoopHistory.deleteMany({ taskId: task._id });
  }
  await ActivityLog.create({
    taskId: task._id,
    actorId: new Types.ObjectId(session.userId),
    type: 'UPDATED',
    payload: body,
  });
  await scheduleTaskJobs(task);
  emitTaskUpdated({ taskId: task._id, patch: body, updatedAt: task.updatedAt });
  if (loopPayload) {
    emitLoopUpdated({
      taskId: task._id.toString(),
      patch: loopPayload,
      updatedAt: task.updatedAt,
    });
  }
  return NextResponse.json<TaskResponse>(serializeTask(task));
});

export const DELETE = withOrganization(
  async (
    _req: NextRequest,
    context: { params: Promise<{ id: string }> },
    session: Session
  ) => {
    const { params } = context;
    const { id } = await params;
    await dbConnect();
    const task: ITask | null = await Task.findById(id);
    if (!task) return problem(404, 'Not Found', 'Task not found');
    if (
    !canWriteTask(
      {
        _id: session.userId,
        teamId: session.teamId,
        organizationId: session.organizationId,
        role: session.role,
      },
      task
    )
    )
      return problem(403, 'Forbidden', 'You cannot delete this task');

    await Task.findByIdAndDelete(task._id);
    await TaskLoop.findOneAndDelete({ taskId: task._id });
    await LoopHistory.deleteMany({ taskId: task._id });
    await ActivityLog.create({
      taskId: task._id,
      actorId: new Types.ObjectId(session.userId),
      type: 'DELETED',
    });

    return NextResponse.json({ success: true });
  }
);

export const PUT = withOrganization(
  async (
    req: NextRequest,
    context: { params: Promise<{ id: string }> },
    session: Session
  ) => {
    let body: TaskPayload;
    try {
      body = putSchema.parse(await req.json());
    } catch (e: unknown) {
      const err = e as Error;
      return problem(400, 'Invalid request', err.message);
    }
    const { params } = context;
    const { id } = await params;
    await dbConnect();
    const task: ITask | null = await Task.findById(id);
    if (!task) return problem(404, 'Not Found', 'Task not found');
    if (
      !canWriteTask(
        {
          _id: session.userId,
          teamId: session.teamId,
          organizationId: session.organizationId,
          role: session.role,
        },
        task
      )
    )
      return problem(403, 'Forbidden', 'You cannot edit this task');
  const owner = await User.findOne({
    _id: new Types.ObjectId(body.ownerId),
    organizationId: new Types.ObjectId(task.organizationId),
  });
    if (!owner) {
      return problem(400, 'Invalid request', 'Owner must be in your organization');
    }
    if (!body.steps) {
      return problem(400, 'Invalid request', 'Steps are required');
    }
    try {
      assertSequentialTaskStepDueDates(body.steps);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid step due dates';
      return problem(400, 'Invalid request', message);
    }
    for (const s of body.steps) {
    const stepOwner = await User.findOne({
      _id: new Types.ObjectId(s.ownerId),
      organizationId: new Types.ObjectId(task.organizationId),
    });
      if (!stepOwner) {
        return problem(400, 'Invalid request', 'Step owner must be in your organization');
      }
    }
    const oldTask = task.toObject();
    task.set({
      title: body.title,
      description: body.description,
      ownerId: new Types.ObjectId(body.ownerId),
      helpers: body.helpers?.map((id) => new Types.ObjectId(id)) ?? [],
      mentions: body.mentions?.map((id) => new Types.ObjectId(id)) ?? [],
      teamId: body.teamId ? new Types.ObjectId(body.teamId) : undefined,
      status: body.status,
      priority: body.priority,
      tags: body.tags,
      visibility: body.visibility,
      dueDate: body.dueDate,
      steps: body.steps.map((s) => ({
        title: s.title,
        ownerId: new Types.ObjectId(s.ownerId),
        description: s.description,
        dueAt: s.dueAt,
        status: s.status ?? 'OPEN',
        completedAt: s.completedAt,
      })),
      currentStepIndex: body.currentStepIndex,
    });
    if (Array.isArray(task.steps) && task.steps.length) {
      const stepIndex = resolveCurrentStepIndex(task.steps);
      task.currentStepIndex = stepIndex;
      task.status = deriveTaskStatusFromSteps(task.steps);
      const activeStep = task.steps[stepIndex] ?? task.steps[task.steps.length - 1];
      if (activeStep) {
        task.ownerId = activeStep.ownerId;
      }
    }
    task.participantIds = computeParticipants({
      createdBy: task.createdBy,
      ownerId: task.ownerId,
      helpers: task.helpers,
      mentions: task.mentions,
      steps: task.steps,
    });
    await task.save();
    const loopData = prepareLoopFromSteps(
      task._id,
      task.steps,
      task.currentStepIndex,
      task.status
    );
    let loopPayload: object | null = null;
    if (loopData) {
      const existingLoop = await TaskLoop.findOne({ taskId: task._id });
      if (existingLoop) {
        existingLoop.set({
          sequence: loopData.sequence,
          currentStep: loopData.currentStep,
          isActive: loopData.isActive,
          parallel: false,
        });
        await existingLoop.save();
        loopPayload =
          typeof (existingLoop as unknown as { toObject?: () => unknown }).toObject === 'function'
            ? ((existingLoop as unknown as { toObject: () => unknown }).toObject() as object)
            : (existingLoop as unknown as object);
      } else {
        const createdLoop = await TaskLoop.create({
          taskId: task._id,
          sequence: loopData.sequence,
          currentStep: loopData.currentStep,
          isActive: loopData.isActive,
          parallel: false,
        });
        await LoopHistory.create(
          loopData.sequence.map((_, idx) => ({
            taskId: createdLoop.taskId,
            stepIndex: idx,
            action: 'CREATE',
            userId: new Types.ObjectId(session.userId),
          }))
        );
        loopPayload =
          typeof (createdLoop as unknown as { toObject?: () => unknown }).toObject === 'function'
            ? ((createdLoop as unknown as { toObject: () => unknown }).toObject() as object)
            : (createdLoop as unknown as object);
      }
    } else {
      await TaskLoop.findOneAndDelete({ taskId: task._id });
      await LoopHistory.deleteMany({ taskId: task._id });
    }
    await ActivityLog.create({
      taskId: task._id,
      actorId: new Types.ObjectId(session.userId),
      type: 'UPDATED',
      payload: body,
    });
    await scheduleTaskJobs(task);
    const patch = diff(oldTask, task.toObject());
    emitTaskUpdated({ taskId: task._id, patch, updatedAt: task.updatedAt });
    if (loopPayload) {
      emitLoopUpdated({
        taskId: task._id.toString(),
        patch: loopPayload,
        updatedAt: task.updatedAt,
      });
    }
    return NextResponse.json<TaskResponse>(serializeTask(task));
  }
);

