import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import dbConnect from '@/lib/db';
import Task from '@/models/Task';
import ActivityLog from '@/models/ActivityLog';
import { auth } from '@/lib/auth';
import { canReadTask } from '@/lib/access';
import { problem } from '@/lib/http';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.userId || !session.organizationId) {
    return problem(401, 'Unauthorized', 'You must be signed in.');
  }

  await dbConnect();
  const task = await Task.findById(params.id);
  if (
    !task ||
    !canReadTask(
      { _id: session.userId, teamId: session.teamId, organizationId: session.organizationId },
      task
    )
  ) {
    return problem(404, 'Not Found', 'Task not found');
  }

  const logs = await ActivityLog.find({ taskId: new Types.ObjectId(params.id) })
    .sort({ createdAt: 1 })
    .populate('actorId', 'name');

  const events = logs.map((log) => {
    let type = log.type;
    if (log.type === 'TRANSITIONED' && (log as any).payload?.action) {
      type = (log as any).payload.action;
    }
    return {
      id: log._id.toString(),
      type,
      user: { name: (log.actorId as any)?.name || 'Unknown' },
      date: log.createdAt,
    };
  });

  return NextResponse.json(events);
}

