import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Types } from 'mongoose';
import dbConnect from '@/lib/db';
import Task from '@/models/Task';
import TaskLoop from '@/models/TaskLoop';
import Comment from '@/models/Comment';
import { auth } from '@/lib/auth';
import { problem } from '@/lib/http';

const querySchema = z.object({
  q: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  skip: z.coerce.number().min(0).default(0),
  sort: z.enum(['recent', 'oldest']).optional(),
});

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.userId) {
    return problem(401, 'Unauthorized', 'You must be signed in.');
  }

  const url = new URL(req.url);
  const raw: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    raw[key] = value;
  });

  let query: z.infer<typeof querySchema>;
  try {
    query = querySchema.parse(raw);
  } catch (e: any) {
    return problem(400, 'Invalid request', e.message);
  }

  await dbConnect();

  const regex = query.q ? new RegExp(query.q, 'i') : null;

  const access: any[] = [
    { participantIds: new Types.ObjectId(session.userId) },
  ];
  if (session.teamId) {
    access.push({ visibility: 'TEAM', teamId: new Types.ObjectId(session.teamId) });
  }

  const taskFilter: any = { $or: access };
  if (regex) {
    taskFilter.$and = [{ $or: access }, { $or: [{ title: regex }, { description: regex }] }];
  }

  const tasks = await Task.find(taskFilter)
    .select('title description createdAt')
    .lean();

  const accessibleTaskIds = tasks.map((t) => t._id);

  const loopFilter: any = { taskId: { $in: accessibleTaskIds } };
  if (regex) loopFilter['sequence.description'] = regex;
  const loops = await TaskLoop.find(loopFilter)
    .select('taskId sequence createdAt')
    .lean();

  const commentFilter: any = { taskId: { $in: accessibleTaskIds } };
  if (regex) commentFilter.content = regex;
  const comments = await Comment.find(commentFilter)
    .select('taskId content createdAt')
    .lean();

  const results: any[] = [];

  tasks.forEach((t: any) => {
    results.push({
      _id: t._id,
      type: 'task',
      taskId: t._id,
      title: t.title,
      excerpt: t.description ? t.description.slice(0, 120) : '',
      createdAt: t.createdAt,
    });
  });

  loops.forEach((l: any) => {
    const step = l.sequence.find((s: any) => (regex ? regex.test(s.description) : true));
    const desc = step?.description || '';
    results.push({
      _id: l._id,
      type: 'loop',
      taskId: l.taskId,
      title: desc.slice(0, 80) || 'Loop step',
      excerpt: desc.slice(0, 120),
      createdAt: l.createdAt,
    });
  });

  comments.forEach((c: any) => {
    results.push({
      _id: c._id,
      type: 'comment',
      taskId: c.taskId,
      title: c.content.slice(0, 80),
      excerpt: c.content.slice(0, 120),
      createdAt: c.createdAt,
    });
  });

  if (query.sort === 'oldest') {
    results.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  } else {
    results.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  const paged = results.slice(query.skip, query.skip + query.limit);

  return NextResponse.json({ results: paged, total: results.length });
}

