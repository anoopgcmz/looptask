import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Types } from 'mongoose';
import dbConnect from '@/lib/db';
import { auth } from '@/lib/auth';
import { canReadTask } from '@/lib/access';
import Comment from '@/models/Comment';
import Task from '@/models/Task';
import User from '@/models/User';
import ActivityLog from '@/models/ActivityLog';
import Notification from '@/models/Notification';
import { parseMentions } from '@/lib/mentions';
import { emitCommentCreated } from '@/lib/ws';

const postSchema = z.object({
  taskId: z.string(),
  body: z.string(),
});

const listQuerySchema = z.object({
  taskId: z.string(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

function problem(status: number, title: string, detail: string) {
  return NextResponse.json({ type: 'about:blank', title, status, detail }, { status });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.userId) {
    return problem(401, 'Unauthorized', 'You must be signed in.');
  }
  let body: z.infer<typeof postSchema>;
  try {
    body = postSchema.parse(await req.json());
  } catch (e: any) {
    return problem(400, 'Invalid request', e.message);
  }
  await dbConnect();
  const task = await Task.findById(body.taskId);
  if (!task || !canReadTask(session, task)) {
    return problem(404, 'Not Found', 'Task not found');
  }
  const mentionEmails = parseMentions(body.body);
  const users = mentionEmails.length
    ? await User.find({ email: { $in: mentionEmails } })
    : [];
  const mentionIds = users.map((u) => u._id);
  const comment = await Comment.create({
    taskId: new Types.ObjectId(body.taskId),
    authorId: new Types.ObjectId(session.userId),
    body: body.body,
    mentions: mentionIds,
    attachments: [],
  });
  if (mentionIds.length) {
    await Task.updateOne(
      { _id: body.taskId },
      { $addToSet: { participantIds: { $each: mentionIds } } }
    );
    const notifications = mentionIds
      .filter((id) => id.toString() !== session.userId)
      .map((id) => ({
        userId: id,
        type: 'COMMENT_MENTION',
        entityRef: { taskId: comment.taskId, commentId: comment._id },
      }));
    if (notifications.length) {
      await Notification.insertMany(notifications);
    }
  }
  await ActivityLog.create({
    taskId: comment.taskId,
    actorId: new Types.ObjectId(session.userId),
    type: 'COMMENT',
    payload: { commentId: comment._id },
  });
  emitCommentCreated({ ...comment.toObject(), taskId: comment.taskId });
  return NextResponse.json(comment, { status: 201 });
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.userId) {
    return problem(401, 'Unauthorized', 'You must be signed in.');
  }
  const url = new URL(req.url);
  const raw: Record<string, any> = {};
  url.searchParams.forEach((value, key) => {
    raw[key] = value;
  });
  let query: z.infer<typeof listQuerySchema>;
  try {
    query = listQuerySchema.parse(raw);
  } catch (e: any) {
    return problem(400, 'Invalid request', e.message);
  }
  await dbConnect();
  const task = await Task.findById(query.taskId);
  if (!task || !canReadTask(session, task)) {
    return problem(404, 'Not Found', 'Task not found');
  }
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const comments = await Comment.find({ taskId: new Types.ObjectId(query.taskId) })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
  return NextResponse.json(comments);
}
