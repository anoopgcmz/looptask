import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Types } from 'mongoose';
import dbConnect from '@/lib/db';
import Task from '@/models/Task';
import TaskLoop from '@/models/TaskLoop';
import { canWriteTask } from '@/lib/access';
import { problem } from '@/lib/http';
import { withOrganization } from '@/lib/middleware/withOrganization';

const loopStepSchema = z.object({
  assignedTo: z.string(),
  description: z.string(),
  estimatedTime: z.number().optional(),
});

const loopSchema = z.object({
  sequence: z.array(loopStepSchema).optional(),
});

export const POST = withOrganization(
  async (
    req: Request,
    { params }: { params: { id: string } },
    session
  ) => {
    let body: z.infer<typeof loopSchema>;
    try {
      body = loopSchema.parse(await req.json().catch(() => ({})));
    } catch (e: any) {
      return problem(400, 'Invalid request', e.message);
    }

    await dbConnect();
    const task = await Task.findById(params.id);
    if (!task) return problem(404, 'Not Found', 'Task not found');
    if (
      !canWriteTask(
        { _id: session.userId, teamId: session.teamId, organizationId: session.organizationId },
        task
      )
    ) {
      return problem(403, 'Forbidden', 'You cannot create a loop for this task');
    }

    const sequence =
      body.sequence?.map((s) => ({
        taskId: new Types.ObjectId(params.id),
        assignedTo: new Types.ObjectId(s.assignedTo),
        description: s.description,
        estimatedTime: s.estimatedTime,
      })) ?? [];

    const loop = await TaskLoop.create({
      taskId: new Types.ObjectId(params.id),
      sequence,
    });

    return NextResponse.json(loop);
  }
);

