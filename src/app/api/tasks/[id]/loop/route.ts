import { NextResponse, type NextRequest } from 'next/server';
import type { Session } from 'next-auth';
import { z } from 'zod';
import mongoose, { Types } from 'mongoose';
import dbConnect from '@/lib/db';
import Task from '@/models/Task';
import type { ITask } from '@/models/Task';
import TaskLoop, { type ITaskLoop } from '@/models/TaskLoop';
import LoopHistory from '@/models/LoopHistory';
import User, { type IUser } from '@/models/User';
import { canWriteTask } from '@/lib/access';
import { problem } from '@/lib/http';
import { withOrganization } from '@/lib/middleware/withOrganization';
import { notifyAssignment, notifyLoopStepReady } from '@/lib/notify';
import { emitLoopUpdated } from '@/lib/ws';

type LeanUser = Pick<IUser, 'organizationId' | 'teamId'> & { _id: Types.ObjectId };

const loopStepSchema = z.object({
  assignedTo: z.string(),
  description: z.string(),
  estimatedTime: z.number().optional(),
  dependencies: z.array(z.string()).optional(),
});

const loopSchema = z.object({
  sequence: z.array(loopStepSchema).optional(),
});

const loopStepStatus = z
  .enum([
    'PENDING',
    'ACTIVE',
    'COMPLETED',
    'BLOCKED',
    'IN_PROGRESS',
    'DONE',
  ])
  .transform((s) => {
    if (s === 'IN_PROGRESS') return 'ACTIVE';
    if (s === 'DONE') return 'COMPLETED';
    return s;
  })
  .pipe(z.enum(['PENDING', 'ACTIVE', 'COMPLETED', 'BLOCKED']));

const loopPatchSchema = z.object({
  parallel: z.boolean().optional(),
  sequence: z
    .array(
      z.object({
        index: z.number().int(),
        assignedTo: z.string().optional(),
        description: z.string().optional(),
        status: loopStepStatus.optional(),
      })
    )
    .optional(),
});

export const POST = withOrganization(
  async (
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
    session: Session
  ) => {
    let body: z.infer<typeof loopSchema>;
    try {
      body = loopSchema.parse(await req.json().catch(() => ({})));
    } catch (e: unknown) {
      const err = e as Error;
      return problem(400, 'Invalid request', err.message);
    }

    const { id } = await params;
    await dbConnect();
    const task = await Task.findById(id).lean<ITask>();
    if (!task) return problem(404, 'Not Found', 'Task not found');
    if (
      !canWriteTask(
        { _id: session.userId, teamId: session.teamId, organizationId: session.organizationId },
        task
      )
    ) {
      return problem(403, 'Forbidden', 'You cannot create a loop for this task');
    }

    const steps = body.sequence ?? [];
    const errors: { index: number; message: string }[] = [];
    const userIds = new Set<string>();
    steps.forEach((s, idx) => {
      if (!Types.ObjectId.isValid(s.assignedTo)) {
        errors.push({ index: idx, message: 'Invalid user ID' });
      } else {
        userIds.add(s.assignedTo);
      }
    });

    if (!errors.length && userIds.size) {
      const users = await User.find({
        _id: { $in: Array.from(userIds).map((id) => new Types.ObjectId(id)) },
      }).lean<LeanUser[]>();
      const userMap = new Map(users.map((u) => [u._id.toString(), u]));
      steps.forEach((s, idx) => {
        const u = userMap.get(s.assignedTo);
        if (!u) {
          errors.push({ index: idx, message: 'Assignee not found' });
        } else if (u.organizationId.toString() !== task.organizationId.toString()) {
          errors.push({ index: idx, message: 'Assignee outside organization' });
        } else if (
          task.teamId &&
          u.teamId?.toString() !== task.teamId.toString()
        ) {
          errors.push({ index: idx, message: 'Assignee not in task team' });
        }
      });
    }

    if (errors.length) {
      const detail = errors
        .map((e) => `Step ${e.index}: ${e.message}`)
        .join('; ');
      return problem(400, 'Invalid request', detail);
    }

    const sequence = steps.map((s) => ({
      taskId: new Types.ObjectId(id),
      assignedTo: new Types.ObjectId(s.assignedTo),
      description: s.description,
      estimatedTime: s.estimatedTime,
      dependencies: s.dependencies?.map((d) => new Types.ObjectId(d)) ?? [],
    }));

    const loop = await TaskLoop.create({
      taskId: new Types.ObjectId(id),
      sequence,
    });

    await LoopHistory.create(
      sequence.map((_, idx) => ({
        taskId: loop.taskId,
        stepIndex: idx,
        action: 'CREATE',
        userId: new Types.ObjectId(session.userId),
      }))
    );
    emitLoopUpdated({ taskId: id, patch: loop, updatedAt: loop.updatedAt });
    return NextResponse.json(loop);
  }
);

export const GET = withOrganization(
  async (
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
    session: Session
  ) => {
    const { id } = await params;
    await dbConnect();
    const task = await Task.findById(id).lean<ITask>();
    if (!task) return problem(404, 'Not Found', 'Task not found');
    if (
      !canWriteTask(
        { _id: session.userId, teamId: session.teamId, organizationId: session.organizationId },
        task
      )
    ) {
      return problem(403, 'Forbidden', 'You cannot access this loop');
    }
      const loop = await TaskLoop.findOne({ taskId: id }).lean<ITaskLoop>();
    if (!loop) return problem(404, 'Not Found', 'Loop not found');
    return NextResponse.json(loop);
  }
);

export const PATCH = withOrganization(
  async (
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
    session: Session
  ) => {
    let body: z.infer<typeof loopPatchSchema>;
    try {
      body = loopPatchSchema.parse(await req.json());
    } catch (e: unknown) {
      const err = e as Error;
      return problem(400, 'Invalid request', err.message);
    }

    const { id } = await params;
    await dbConnect();
    const task = await Task.findById(id).lean<ITask>();
    if (!task) return problem(404, 'Not Found', 'Task not found');
    if (
      !canWriteTask(
        { _id: session.userId, teamId: session.teamId, organizationId: session.organizationId },
        task
      )
    ) {
      return problem(403, 'Forbidden', 'You cannot modify this loop');
    }
      const loop = await TaskLoop.findOne({ taskId: id }).lean<ITaskLoop>();
    if (!loop) return problem(404, 'Not Found', 'Loop not found');

    const { sequence: steps, parallel } = body;

    if (steps) {
      if (steps.length !== loop.sequence.length) {
        return problem(400, 'Invalid request', 'Sequence length mismatch');
      }

      const errors: { index: number; message: string }[] = [];
      const userIds = new Set<string>();
      const seen = new Set<number>();
      steps.forEach((s, idx) => {
        if (seen.has(s.index)) {
          errors.push({ index: idx, message: 'Duplicate index' });
        } else if (s.index < 0 || s.index >= loop.sequence.length) {
          errors.push({ index: idx, message: 'Invalid index' });
        } else {
          seen.add(s.index);
        }
        if (s.assignedTo !== undefined) {
          if (!Types.ObjectId.isValid(s.assignedTo)) {
            errors.push({ index: idx, message: 'Invalid user ID' });
          } else {
            userIds.add(s.assignedTo);
          }
        }
      });

      if (!errors.length && userIds.size) {
        const users = await User.find({
          _id: { $in: Array.from(userIds).map((id) => new Types.ObjectId(id)) },
        }).lean<LeanUser[]>();
        const userMap = new Map(users.map((u) => [u._id.toString(), u]));
        steps.forEach((s, idx) => {
          if (s.assignedTo !== undefined) {
            const u = userMap.get(s.assignedTo);
            if (!u) {
              errors.push({ index: idx, message: 'Assignee not found' });
            } else if (u.organizationId.toString() !== task.organizationId.toString()) {
              errors.push({ index: idx, message: 'Assignee outside organization' });
            } else if (
              task.teamId &&
              u.teamId?.toString() !== task.teamId.toString()
            ) {
              errors.push({ index: idx, message: 'Assignee not in task team' });
            }
          }
        });
      }

      if (errors.length) {
        const detail = errors
          .map((e) => `Step ${e.index}: ${e.message}`)
          .join('; ');
        return problem(400, 'Invalid request', detail);
      }
    }

    const sessionDb = await mongoose.startSession();
    const newAssignments: { userId: string; description: string }[] = [];
    const oldAssignments: { userId: string; description: string }[] = [];
    const history: { stepIndex: number; action: 'UPDATE' | 'COMPLETE' | 'REASSIGN' }[] = [];
    let updatedLoop: ITaskLoop | null = null;
  try {
    await sessionDb.withTransaction(async () => {
      const loopDoc = await TaskLoop.findOne({ taskId: id }).session(sessionDb);
      if (!loopDoc) return;
      if (steps) {
        steps.forEach((s) => {
          const current = loopDoc.sequence[s.index];
          if (s.assignedTo !== undefined && s.assignedTo !== current.assignedTo.toString()) {
            oldAssignments.push({ userId: current.assignedTo.toString(), description: current.description });
            newAssignments.push({ userId: s.assignedTo, description: current.description });
            current.assignedTo = new Types.ObjectId(s.assignedTo);
            if (current.status !== 'PENDING' && s.status === undefined) {
              current.status = 'PENDING';
              loopDoc.isActive = true;
              if (loopDoc.currentStep === -1 || s.index < loopDoc.currentStep) {
                loopDoc.currentStep = s.index;
              }
            }
            history.push({ stepIndex: s.index, action: 'REASSIGN' });
          }
          if (s.description !== undefined && s.description !== current.description) {
            current.description = s.description;
            history.push({ stepIndex: s.index, action: 'UPDATE' });
          }
          if (s.status !== undefined && s.status !== current.status) {
            current.status = s.status;
            history.push({
              stepIndex: s.index,
              action: s.status === 'COMPLETED' ? 'COMPLETE' : 'UPDATE',
            });
          }
        });
      }
      if (parallel !== undefined) {
        loopDoc.parallel = parallel;
      }
      await loopDoc.save({ session: sessionDb });
      if (history.length) {
        await LoopHistory.create(
          history.map((h) => ({
            taskId: loopDoc.taskId,
            stepIndex: h.stepIndex,
            action: h.action,
            userId: new Types.ObjectId(session.userId),
          })),
          { session: sessionDb }
        );
      }
      updatedLoop = loopDoc;
    });
  } finally {
    await sessionDb.endSession();
  }
  if (!updatedLoop) return problem(404, 'Not Found', 'Loop not found');

  const notifyTask = task as Pick<ITask, '_id' | 'title' | 'status'>;

  for (const a of newAssignments) {
    const uid = new Types.ObjectId(a.userId);
    await notifyAssignment([uid], notifyTask, a.description);
    await notifyLoopStepReady([uid], notifyTask, a.description);
  }
  for (const a of oldAssignments) {
    const uid = new Types.ObjectId(a.userId);
    await notifyAssignment([uid], notifyTask, a.description);
  }
  const loop = updatedLoop as ITaskLoop;
  emitLoopUpdated({ taskId: id, patch: body, updatedAt: loop.updatedAt });
  return NextResponse.json(loop);
  }
);

export const DELETE = withOrganization(
  async (
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
    session: Session
  ) => {
    const { id } = await params;
    await dbConnect();
      const task = await Task.findById(id).lean<ITask>();
    if (!task) return problem(404, 'Not Found', 'Task not found');
    if (
      !canWriteTask(
        { _id: session.userId, teamId: session.teamId, organizationId: session.organizationId },
        task
      )
    ) {
      return problem(403, 'Forbidden', 'You cannot delete this loop');
    }
      const loop = await TaskLoop.findOneAndDelete({ taskId: id }).lean();
    if (!loop) return problem(404, 'Not Found', 'Loop not found');
    return NextResponse.json({ success: true });
  }
);

