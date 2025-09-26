import { NextResponse, type NextRequest } from 'next/server';
import { Types } from 'mongoose';
import dbConnect from '@/lib/db';
import { Task } from '@/models/Task';
import { ActivityLog } from '@/models/ActivityLog';
import { auth } from '@/lib/auth';
import { canReadTask } from '@/lib/access';
import { problem } from '@/lib/http';
import { isPlatformRole } from '@/lib/roles';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { params } = context;
  const { id } = await params;
  const session = await auth();
  const isPlatform = isPlatformRole(session?.role);
  if (!session?.userId || (!isPlatform && !session.organizationId)) {
    return problem(401, 'Unauthorized', 'You must be signed in.');
  }
  await dbConnect();
  const task = await Task.findById(id);
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

  const logs = await ActivityLog.find({ taskId: new Types.ObjectId(id) })
    .sort({ createdAt: 1 })
    .populate('actorId', 'name');

  const transitionMessages: Record<string, string> = {
    START: 'Marked the task as in progress',
    SEND_FOR_REVIEW: 'Sent the task for review',
    REQUEST_CHANGES: 'Requested changes',
    DONE: 'Marked the task as done',
  };

  const defaultMessages: Record<string, string> = {
    CREATED: 'Created the task',
    UPDATED: 'Updated the task',
    DELETED: 'Deleted the task',
  };

  const events = logs.map((log) => {
    const actor = log.actorId as { name?: string };
    const base = {
      id: log._id.toString(),
      user: { name: actor?.name || 'Unknown' },
      date: log.createdAt,
    };

    if (log.type === 'COMMENT') {
      return { ...base, type: 'comment', status: 'Left a comment' };
    }

    const payload = (log as { payload?: { action?: string } }).payload;
    if (log.type === 'TRANSITIONED') {
      const action = payload?.action ?? '';
      const status = transitionMessages[action] ?? 'Updated the task status';
      return { ...base, type: 'transition', status };
    }

    const status = defaultMessages[log.type] ?? 'Updated the task';
    return { ...base, type: 'update', status };
  });

  return NextResponse.json(events);
}

export const runtime = 'nodejs';

