import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { Types, type FilterQuery } from 'mongoose';
import dbConnect from '@/lib/db';
import { auth } from '@/lib/auth';
import { canReadTask } from '@/lib/access';
import { Comment, type IComment } from '@/models/Comment';
import { Task } from '@/models/Task';
import { ActivityLog } from '@/models/ActivityLog';
import { emitCommentCreated } from '@/lib/ws';
import { problem } from '@/lib/http';
import { isPlatformRole } from '@/lib/roles';

const postSchema = z.object({
  taskId: z.string(),
  content: z.string(),
  parentId: z.string().optional(),
});

const listQuerySchema = z.object({
  taskId: z.string(),
  parentId: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const session = await auth();
  const isPlatform = isPlatformRole(session?.role);
  if (!session?.userId || (!isPlatform && !session.organizationId)) {
    return problem(401, 'Unauthorized', 'You must be signed in.');
  }
  let body: z.infer<typeof postSchema>;
  try {
    body = postSchema.parse(await req.json());
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Invalid request';
    return problem(400, 'Invalid request', message);
  }
  await dbConnect();
  const task = await Task.findById(body.taskId);
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
  const comment = await Comment.create({
    taskId: new Types.ObjectId(body.taskId),
    userId: new Types.ObjectId(session.userId),
    content: body.content,
    parentId: body.parentId ? new Types.ObjectId(body.parentId) : null,
  });
  await ActivityLog.create({
    taskId: comment.taskId,
    actorId: new Types.ObjectId(session.userId),
    type: 'COMMENT',
    payload: { commentId: comment._id },
  });
  emitCommentCreated({ ...comment.toObject(), taskId: comment.taskId });
  return NextResponse.json(comment, { status: 201 });
}

export async function GET(req: NextRequest) {
  const session = await auth();
  const isPlatform = isPlatformRole(session?.role);
  if (!session?.userId || (!isPlatform && !session.organizationId)) {
    return problem(401, 'Unauthorized', 'You must be signed in.');
  }
  const url = new URL(req.url);
  const raw: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    raw[key] = value;
  });
  let query: z.infer<typeof listQuerySchema>;
  try {
    query = listQuerySchema.parse(raw);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Invalid request';
    return problem(400, 'Invalid request', message);
  }
  await dbConnect();
  const task = await Task.findById(query.taskId);
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
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const filter: FilterQuery<IComment> = {
    taskId: new Types.ObjectId(query.taskId),
    parentId: query.parentId ? new Types.ObjectId(query.parentId) : null,
  };
  const comments = await Comment.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
  return NextResponse.json(comments);
}
