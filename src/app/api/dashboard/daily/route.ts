import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { Types } from 'mongoose';
import dbConnect from '@/lib/db';
import Objective from '@/models/Objective';
import Task from '@/models/Task';
import { auth } from '@/lib/auth';
import { problem } from '@/lib/http';

const querySchema = z.object({
  date: z.string(),
  teamId: z.string(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.userId) {
    return problem(401, 'Unauthorized', 'You must be signed in.');
  }
  const url = new URL(req.url);
  let query: z.infer<typeof querySchema>;
  try {
    query = querySchema.parse({
      date: url.searchParams.get('date'),
      teamId: url.searchParams.get('teamId'),
    });
  } catch (e: unknown) {
    const err = e as Error;
    return problem(400, 'Invalid request', err.message);
  }
  if (session.teamId && session.teamId !== query.teamId) {
    return problem(403, 'Forbidden', 'Wrong team');
  }
  await dbConnect();
  const objectives = await Objective.find({
    date: query.date,
    teamId: new Types.ObjectId(query.teamId),
  });
  const summaryMap = new Map<string, { ownerId: string; completed: number; total: number }>();
  const pending: unknown[] = [];
  objectives.forEach((o) => {
    const key = o.ownerId.toString();
    if (!summaryMap.has(key)) {
      summaryMap.set(key, { ownerId: key, completed: 0, total: 0 });
    }
    const rec = summaryMap.get(key)!;
    rec.total++;
    if (o.status === 'DONE') {
      rec.completed++;
    } else {
      pending.push(o);
    }
  });

  const start = new Date(query.date);
  const end = new Date(start);
  end.setDate(start.getDate() + 1);
  const access: unknown[] = [
    { participantIds: new Types.ObjectId(session.userId) },
  ];
  if (session.teamId) {
    access.push({ visibility: 'TEAM', teamId: new Types.ObjectId(session.teamId) });
  }
  const tasks = await Task.find({
    dueDate: { $gte: start, $lt: end },
    $or: access,
  });
  const taskMap = new Map<string, unknown[]>();
  tasks.forEach((t) => {
    const key = t.ownerId.toString();
    if (!taskMap.has(key)) taskMap.set(key, []);
    taskMap.get(key)!.push(t);
  });
  const tasksByOwner = Array.from(taskMap.entries()).map(([ownerId, tasks]) => ({
    ownerId,
    tasks,
  }));

  return NextResponse.json({
    summary: Array.from(summaryMap.values()),
    pending,
    tasks: tasksByOwner,
  });
}

