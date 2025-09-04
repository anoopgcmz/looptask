import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Types, startSession } from 'mongoose';
import dbConnect from '@/lib/db';
import Task from '@/models/Task';
import ActivityLog from '@/models/ActivityLog';
import { auth } from '@/lib/auth';
import { emitTaskTransition } from '@/lib/ws';
import {
  notifyStatusChange,
  notifyFlowAdvanced,
  notifyTaskClosed,
} from '@/lib/notify';
import { problem } from '@/lib/http';

const bodySchema = z.object({
  action: z.enum(['START', 'SEND_FOR_REVIEW', 'REQUEST_CHANGES', 'DONE']),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.userId || !session.organizationId)
    return problem(401, 'Unauthorized', 'You must be signed in.');

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch (e: any) {
    return problem(400, 'Invalid request', e.message);
  }

  await dbConnect();
  const task = await Task.findById(params.id);
  if (!task || task.organizationId.toString() !== session.organizationId)
    return problem(404, 'Not Found', 'Task not found');

  const actorId = session.userId;
  const isCreator = task.createdBy.toString() === actorId;
  const isOwner = task.ownerId?.toString() === actorId;
  if (!isCreator && !isOwner) {
    return problem(403, 'Forbidden', 'You cannot transition this task');
  }

  if (task.steps?.length) {
    // Only DONE is meaningful when steps exist
    if (body.action !== 'DONE') {
      return problem(400, 'Invalid action', 'Only DONE is allowed for step tasks');
    }
    if (!isOwner) {
      return problem(403, 'Forbidden', 'Only current step owner may complete the step');
    }

    const mongoSession = await startSession();
    let updated: any;
    await mongoSession.withTransaction(async () => {
      const t = await Task.findById(task._id).session(mongoSession);
      if (!t) throw new Error('Task not found');
      const idx = t.currentStepIndex ?? 0;
      const step = t.steps[idx];
      if (!step || step.status === 'DONE') return;
      step.status = 'DONE';
      step.completedAt = new Date();
      if (idx + 1 < t.steps.length) {
        t.currentStepIndex = idx + 1;
        t.ownerId = t.steps[idx + 1].ownerId;
        t.status = 'FLOW_IN_PROGRESS';
      } else {
        t.status = 'DONE';
      }
      await t.save({ session: mongoSession });
      await ActivityLog.create(
        [
          {
            taskId: t._id,
            actorId: new Types.ObjectId(actorId),
            type: 'TRANSITIONED',
            payload: { action: body.action },
          },
        ],
        { session: mongoSession }
      );
      updated = t;
    });
    if (!updated) return problem(500, 'Error', 'Transition failed');
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
        await notifyFlowAdvanced([ownerId] as Types.ObjectId[], updated);
      }
    }
    emitTaskTransition(updated);
    return NextResponse.json(updated);
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
    task.status = newStatus;
    await task.save();
    await ActivityLog.create({
      taskId: task._id,
      actorId: new Types.ObjectId(actorId),
      type: 'TRANSITIONED',
      payload: { action: body.action },
    });
    const recipients = (task.participantIds || []).filter(
      (id) => id.toString() !== actorId
    );
    if (recipients.length) {
      if (newStatus === 'DONE') {
        await notifyTaskClosed(recipients as Types.ObjectId[], task);
      } else {
        await notifyStatusChange(recipients as Types.ObjectId[], task);
      }
    }
    emitTaskTransition(task);
    return NextResponse.json(task);
  }
}

