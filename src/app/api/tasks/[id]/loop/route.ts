import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Types } from 'mongoose';
import dbConnect from '@/lib/db';
import Task from '@/models/Task';
import TaskLoop from '@/models/TaskLoop';
import User from '@/models/User';
import { canWriteTask } from '@/lib/access';
import { problem } from '@/lib/http';
import { withOrganization } from '@/lib/middleware/withOrganization';

const loopStepSchema = z.object({
  assignedTo: z.string(),
  description: z.string(),
  estimatedTime: z.number().optional(),
  dependencies: z.array(z.string()).optional(),
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

    const steps = body.sequence ?? [];
    const errors: { index: number; message: string }[] = [];
    const userIds = new Set<string>();
    steps.forEach((s, idx) => {
      if (!Types.ObjectId.isValid(s.assignedTo)) {
        errors.push({ index: idx, message: 'Invalid user ID' });
      } else {
        userIds.add(s.assignedTo);
      }
    });

    if (!errors.length && userIds.size) {
      const users = await User.find({
        _id: { $in: Array.from(userIds).map((id) => new Types.ObjectId(id)) },
      });
      const userMap = new Map(users.map((u) => [u._id.toString(), u]));
      steps.forEach((s, idx) => {
        const u = userMap.get(s.assignedTo);
        if (!u) {
          errors.push({ index: idx, message: 'Assignee not found' });
        } else if (u.organizationId.toString() !== task.organizationId.toString()) {
          errors.push({ index: idx, message: 'Assignee outside organization' });
        } else if (
          task.teamId &&
          u.teamId?.toString() !== task.teamId.toString()
        ) {
          errors.push({ index: idx, message: 'Assignee not in task team' });
        }
      });
    }

    if (errors.length) {
      return NextResponse.json({ errors }, { status: 400 });
    }

    const sequence = steps.map((s) => ({
      taskId: new Types.ObjectId(params.id),
      assignedTo: new Types.ObjectId(s.assignedTo),
      description: s.description,
      estimatedTime: s.estimatedTime,
      dependencies: s.dependencies?.map((d) => new Types.ObjectId(d)) ?? [],
    }));

    const loop = await TaskLoop.create({
      taskId: new Types.ObjectId(params.id),
      sequence,
    });

    return NextResponse.json(loop);
  }
);

