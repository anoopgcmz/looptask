import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { Types } from 'mongoose';
import dbConnect from '@/lib/db';
import Task from '@/models/Task';
import LoopHistory from '@/models/LoopHistory';
import { canReadTask } from '@/lib/access';
import { problem } from '@/lib/http';
import { withOrganization } from '@/lib/middleware/withOrganization';

const querySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const GET = withOrganization(
  async (
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
    session
  ) => {
    const url = new URL(req.url);
    const raw: Record<string, any> = {};
    url.searchParams.forEach((value, key) => {
      raw[key] = value;
    });
    let query: z.infer<typeof querySchema>;
    try {
      query = querySchema.parse(raw);
    } catch (e: any) {
      return problem(400, 'Invalid request', e.message);
    }

    const { id } = await params;
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

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const history = await LoopHistory.find({ taskId: new Types.ObjectId(id) })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return NextResponse.json(history);
  }
);
