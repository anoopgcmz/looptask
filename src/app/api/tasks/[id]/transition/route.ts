import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { Types, startSession } from 'mongoose';
import type { ClientSession } from 'mongoose';
import { MongoServerError } from 'mongodb';
import dbConnect from '@/lib/db';
import { Task, type IStep } from '@/models/Task';
import { ActivityLog } from '@/models/ActivityLog';
import { auth } from '@/lib/auth';
import { emitTaskTransition } from '@/lib/ws';
import { diff } from '@/lib/diff';
import {
  notifyStatusChange,
  notifyLoopStepReady,
  notifyTaskClosed,
  notifyAssignment,
} from '@/lib/notify';
import { problem } from '@/lib/http';
import type { TaskResponse } from '@/types/api/task';
import { serializeTask } from '@/lib/serializeTask';
import type { ITask } from '@/models/Task';

const bodySchema = z.object({
  action: z.enum(['START', 'SEND_FOR_REVIEW', 'REQUEST_CHANGES', 'DONE']),
});

export const runtime = 'nodejs';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { params } = context;
  const { id } = await params;
  const session = await auth();
  if (!session?.userId || !session.organizationId)
    return problem(401, 'Unauthorized', 'You must be signed in.');
  const isAdmin = session.role === 'ADMIN';

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch (e: unknown) {
    const err = e as Error;
    return problem(400, 'Invalid request', err.message);
  }

  await dbConnect();
  const task = await Task.findById(id).lean<ITask>();
  if (!task || task.organizationId.toString() !== session.organizationId)
    return problem(404, 'Not Found', 'Task not found');

  const actorId = session.userId;
  const isCreator = task.createdBy.toString() === actorId;
  const isOwner = task.ownerId?.toString() === actorId;
  if (!isCreator && !isOwner && !isAdmin) {
    return problem(
      403,
      'Forbidden',
      'Only the creator, current owner, or an admin may transition this task'
    );
  }

  const isTransactionUnsupportedError = (err: unknown): err is MongoServerError => {
    if (!(err instanceof MongoServerError)) return false;
    if (err.code === 303 || err.code === 112) return true;
    const message = err.message?.toLowerCase?.() ?? '';
    return (
      message.includes('transactions are not supported') ||
      message.includes('transaction numbers are only allowed on a replica set member or mongos')
    );
  };

  if (task.steps?.length) {
    // Only DONE is meaningful when steps exist
    if (body.action !== 'DONE') {
      return problem(400, 'Invalid action', 'Only DONE is allowed for step tasks');
    }
    if (!isOwner && !isAdmin) {
      return problem(
        403,
        'Forbidden',
        'Only the current step owner or an admin may complete the step'
      );
    }

    const performStepTransition = async (
      session?: ClientSession
    ): Promise<{ updated: ITask | null; failure: 'NONE' | 'STEP_MISSING' | 'STEP_DONE' }> => {
      const t = (session
        ? ((await Task.findById(task._id).session(session)) as ITask | null)
        : ((await Task.findById(task._id)) as ITask | null));
      if (!t) throw new Error('Task not found');
      if (!t.steps) throw new Error('Task steps missing');
      const idx = t.currentStepIndex ?? 0;
      const step = t.steps[idx];
      if (!step) {
        return { updated: null, failure: 'STEP_MISSING' };
      }
      if (step.status === 'DONE') {
        return { updated: null, failure: 'STEP_DONE' };
      }
      step.status = 'DONE';
      step.completedAt = new Date();

      const allDone = t.steps.every((s: IStep) => s.status === 'DONE');
      if (allDone) {
        t.status = 'DONE';
      } else {
        const nextIdx = t.steps.findIndex((s: IStep) => s.status !== 'DONE');
        t.currentStepIndex = nextIdx;
        t.ownerId = t.steps[nextIdx].ownerId;
        t.status = 'FLOW_IN_PROGRESS';
      }
      if (session) {
        await t.save({ session });
      } else {
        await t.save();
      }
      const activity = [
        {
          taskId: t._id,
          actorId: new Types.ObjectId(actorId),
          type: 'TRANSITIONED',
          payload: { action: body.action },
        },
      ];
      if (session) {
        await ActivityLog.create(activity, { session });
      } else {
        await ActivityLog.create(activity);
      }
      return { updated: t, failure: 'NONE' };
    };

    const mongoSession = await startSession();
    let result: { updated: ITask | null; failure: 'NONE' | 'STEP_MISSING' | 'STEP_DONE' } = {
      updated: null,
      failure: 'NONE',
    };
    try {
      await mongoSession.withTransaction(async () => {
        result = await performStepTransition(mongoSession);
      });
    } catch (error) {
      if (isTransactionUnsupportedError(error)) {
        result = await performStepTransition();
      } else {
        throw error;
      }
    } finally {
      await mongoSession.endSession();
    }

    const { updated, failure } = result;
    if (!updated) {
      if (failure === 'STEP_MISSING') {
        return problem(404, 'Not Found', 'Current step not found');
      }
      if (failure === 'STEP_DONE') {
        return problem(409, 'Conflict', 'Step already completed');
      }
      return problem(500, 'Error', 'Transition failed');
    }
    const recipients = (updated.participantIds || []).filter(
      (id: Types.ObjectId) => id.toString() !== actorId
    );
    if (updated.status === 'DONE') {
      if (recipients.length) {
        await notifyTaskClosed(recipients as Types.ObjectId[], updated);
      }
    } else {
      const ownerId = updated.ownerId;
      if (ownerId && ownerId.toString() !== actorId) {
        const step = updated.steps?.[updated.currentStepIndex];
        const desc = step ? step.title : undefined;
        await notifyAssignment([ownerId] as Types.ObjectId[], updated, desc);
        await notifyLoopStepReady([ownerId] as Types.ObjectId[], updated, desc);
      }
    }
    const patch = diff(task, updated.toObject());
    emitTaskTransition({
      taskId: updated._id,
      patch,
      updatedAt: updated.updatedAt,
    });
    return NextResponse.json<TaskResponse>(serializeTask(updated));
  } else {
    let newStatus = task.status;
    switch (body.action) {
      case 'START':
        if (task.status !== 'OPEN') return problem(400, 'Invalid action', 'Task is not OPEN');
        newStatus = 'IN_PROGRESS';
        break;
      case 'SEND_FOR_REVIEW':
        if (task.status !== 'IN_PROGRESS' && task.status !== 'REVISIONS')
          return problem(400, 'Invalid action', 'Task not ready for review');
        newStatus = 'IN_REVIEW';
        break;
      case 'REQUEST_CHANGES':
        if (task.status !== 'IN_REVIEW')
          return problem(400, 'Invalid action', 'Task not in review');
        newStatus = 'REVISIONS';
        break;
      case 'DONE':
        if (task.status !== 'IN_REVIEW' && task.status !== 'REVISIONS')
          return problem(400, 'Invalid action', 'Task cannot be completed');
        newStatus = 'DONE';
        break;
    }

    const performSimpleTransition = async (
      session?: ClientSession
    ): Promise<ITask | null> => {
      const t = (session
        ? ((await Task.findById(task._id).session(session)) as ITask | null)
        : ((await Task.findById(task._id)) as ITask | null));
      if (!t) throw new Error('Task not found');
      t.status = newStatus;
      if (session) {
        await t.save({ session });
      } else {
        await t.save();
      }
      const activity = {
        taskId: t._id,
        actorId: new Types.ObjectId(actorId),
        type: 'TRANSITIONED',
        payload: { action: body.action },
      };
      if (session) {
        await ActivityLog.create(activity, { session });
      } else {
        await ActivityLog.create(activity);
      }
      return t;
    };

    const mongoSession = await startSession();
    let updated: ITask | null = null;
    try {
      await mongoSession.withTransaction(async () => {
        updated = await performSimpleTransition(mongoSession);
      });
    } catch (error) {
      if (isTransactionUnsupportedError(error)) {
        updated = await performSimpleTransition();
      } else {
        throw error;
      }
    } finally {
      await mongoSession.endSession();
    }

    const recipients = (updated.participantIds || []).filter(
      (id: Types.ObjectId) => id.toString() !== actorId
    );
    if (recipients.length) {
      if (newStatus === 'DONE') {
        await notifyTaskClosed(recipients as Types.ObjectId[], updated);
      } else {
        await notifyStatusChange(recipients as Types.ObjectId[], updated);
      }
    }
    const patch = diff(task, updated.toObject());
    emitTaskTransition({
      taskId: updated._id,
      patch,
      updatedAt: updated.updatedAt,
    });
    return NextResponse.json<TaskResponse>(serializeTask(updated));
  }
}

