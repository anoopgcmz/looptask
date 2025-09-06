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
  page: z.coerce.number().min(1).default(1),
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
  const hlRegex = query.q ? new RegExp(query.q, 'gi') : null;

  const highlight = (text: string) =>
    hlRegex ? text.replace(hlRegex, (m) => `<mark>${m}</mark>`) : text;

  const snippet = (text: string, length = 120) => {
    if (!text) return '';
    if (!hlRegex) return text.slice(0, length);
    const match = regex!.exec(text);
    if (!match) return text.slice(0, length);
    const start = Math.max(match.index - Math.floor(length / 2), 0);
    const end = Math.min(start + length, text.length);
    const seg = text.slice(start, end);
    return (start > 0 ? '...' : '') +
      highlight(seg) +
      (end < text.length ? '...' : '');
  };

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
      title: highlight(t.title),
      excerpt: snippet(t.description || ''),
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
      title: desc ? snippet(desc, 80) : 'Loop step',
      excerpt: snippet(desc),
      createdAt: l.createdAt,
    });
  });

  comments.forEach((c: any) => {
    results.push({
      _id: c._id,
      type: 'comment',
      taskId: c.taskId,
      title: snippet(c.content, 80),
      excerpt: snippet(c.content),
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

  const skip = (query.page - 1) * query.limit;
  const paged = results.slice(skip, skip + query.limit);

  return NextResponse.json({ results: paged, total: results.length });
}

