import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Types } from 'mongoose';
import dbConnect from '@/lib/db';
import Task from '@/models/Task';
import ActivityLog from '@/models/ActivityLog';
import { auth } from '@/lib/auth';
import { canReadTask, canWriteTask } from '@/lib/access';
import { scheduleTaskJobs } from '@/lib/agenda';

const patchSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  ownerId: z.string().optional(),
  helpers: z.array(z.string()).optional(),
  mentions: z.array(z.string()).optional(),
  teamId: z.string().optional(),
  status: z.enum(['OPEN','IN_PROGRESS','IN_REVIEW','REVISIONS','FLOW_IN_PROGRESS','DONE']).optional(),
  priority: z.enum(['LOW','MEDIUM','HIGH']).optional(),
  tags: z.array(z.string()).optional(),
  visibility: z.enum(['PRIVATE','TEAM']).optional(),
  dueAt: z.coerce.date().optional(),
  steps: z.array(
    z.object({
      ownerId: z.string(),
      description: z.string().optional(),
      dueAt: z.coerce.date().optional(),
      status: z.enum(['OPEN','DONE']).optional(),
      completedAt: z.coerce.date().optional(),
    })
  ).optional(),
  currentStepIndex: z.number().int().optional(),
});

function problem(status: number, title: string, detail: string) {
  return NextResponse.json({ type: 'about:blank', title, status, detail }, { status });
}

function computeParticipants(task: any) {
  const ids = new Set<string>();
  ids.add(task.creatorId.toString());
  ids.add(task.ownerId.toString());
  task.helpers?.forEach((h: any) => ids.add(h.toString()));
  task.mentions?.forEach((m: any) => ids.add(m.toString()));
  task.steps?.forEach((s: any) => ids.add(s.ownerId.toString()));
  task.participantIds = Array.from(ids).map((id) => new Types.ObjectId(id));
}


export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.userId) return problem(401, 'Unauthorized', 'You must be signed in.');
  await dbConnect();
  const task = await Task.findById(params.id);
  if (!task || !canReadTask(session, task)) {
    return problem(404, 'Not Found', 'Task not found');
  }
  return NextResponse.json(task);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.userId) return problem(401, 'Unauthorized', 'You must be signed in.');
  let body: z.infer<typeof patchSchema>;
  try {
    body = patchSchema.parse(await req.json());
  } catch (e: any) {
    return problem(400, 'Invalid request', e.message);
  }
  await dbConnect();
  const task = await Task.findById(params.id);
  if (!task) return problem(404, 'Not Found', 'Task not found');
  if (!canWriteTask(session, task)) return problem(403, 'Forbidden', 'You cannot edit this task');
  Object.assign(task, {
    ...body,
    ownerId: body.ownerId ? new Types.ObjectId(body.ownerId) : task.ownerId,
    helpers: body.helpers?.map((id) => new Types.ObjectId(id)) ?? task.helpers,
    mentions: body.mentions?.map((id) => new Types.ObjectId(id)) ?? task.mentions,
    teamId: body.teamId ? new Types.ObjectId(body.teamId) : task.teamId,
    steps: body.steps
      ? body.steps.map((s) => ({
          ownerId: new Types.ObjectId(s.ownerId),
          description: s.description,
          dueAt: s.dueAt,
          status: s.status ?? 'OPEN',
          completedAt: s.completedAt,
        }))
      : task.steps,
  });
  if (task.steps?.length) {
    task.status = 'FLOW_IN_PROGRESS';
    task.ownerId = task.steps[task.currentStepIndex ?? 0].ownerId;
  }
  computeParticipants(task);
  await task.save();
  await ActivityLog.create({
    taskId: task._id,
    actorId: new Types.ObjectId(session.userId),
    type: 'UPDATED',
    payload: body,
  });
  await scheduleTaskJobs(task);
  return NextResponse.json(task);
}

