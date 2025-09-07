import { NextResponse, type NextRequest } from 'next/server';
import { Types } from 'mongoose';
import dbConnect from '@/lib/db';
import Task from '@/models/Task';
import ActivityLog from '@/models/ActivityLog';
import { auth } from '@/lib/auth';
import { canReadTask } from '@/lib/access';
import { problem } from '@/lib/http';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.userId || !session.organizationId) {
    return problem(401, 'Unauthorized', 'You must be signed in.');
  }

  const { id } = params;
  await dbConnect();
  const task = await Task.findById(id);
  if (
    !task ||
    !canReadTask(
      { _id: session.userId, teamId: session.teamId, organizationId: session.organizationId },
      task
    )
  ) {
    return problem(404, 'Not Found', 'Task not found');
  }

  const logs = await ActivityLog.find({ taskId: new Types.ObjectId(id) })
    .sort({ createdAt: 1 })
    .populate('actorId', 'name');

  const events = logs.map((log) => {
    let type = log.type;
    const payload = (log as { payload?: { action?: string } }).payload;
    if (log.type === 'TRANSITIONED' && payload?.action) {
      type = payload.action;
    }
    const actor = log.actorId as { name?: string };
    return {
      id: log._id.toString(),
      type,
      user: { name: actor?.name || 'Unknown' },
      date: log.createdAt,
    };
  });

  return NextResponse.json(events);
}

