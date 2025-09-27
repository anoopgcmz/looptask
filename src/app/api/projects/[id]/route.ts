import { NextResponse, type NextRequest } from 'next/server';
import { Types } from 'mongoose';
import dbConnect from '@/lib/db';
import { withOrganization } from '@/lib/middleware/withOrganization';
import { problem } from '@/lib/http';
import { Project } from '@/models/Project';
import type { IProject } from '@/models/Project';
import { Task } from '@/models/Task';

interface ProjectCounts {
  pending: number;
  done: number;
}

function serializeProject(
  project: IProject & {
    _id: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
  },
  counts: ProjectCounts
) {
  return {
    _id: project._id.toString(),
    organizationId: project.organizationId.toString(),
    name: project.name,
    description: project.description,
    typeId: project.type ? project.type.toString() : undefined,
    createdBy: project.createdBy.toString(),
    updatedBy: project.updatedBy.toString(),
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    pendingCount: counts.pending,
    doneCount: counts.done,
  };
}

export const GET = withOrganization(
  async (
    req: NextRequest,
    context: { params: Promise<{ id: string }> },
    session
  ) => {
    const { params } = context;
    const { id } = await params;
    if (!Types.ObjectId.isValid(id)) {
      return problem(400, 'Invalid request', 'Project id is invalid');
    }

    await dbConnect();

    const orgId = new Types.ObjectId(session.organizationId);
    const project = await Project.findOne({
      _id: new Types.ObjectId(id),
      organizationId: orgId,
    });
    if (!project) {
      return problem(404, 'Not Found', 'Project not found');
    }

    const [aggregate] = await Task.aggregate<{ _id: Types.ObjectId; pending: number; done: number }>([
      {
        $match: {
          organizationId: orgId,
          projectId: project._id,
        },
      },
      {
        $group: {
          _id: '$projectId',
          pending: {
            $sum: {
              $cond: [{ $eq: ['$status', 'DONE'] }, 0, 1],
            },
          },
          done: {
            $sum: {
              $cond: [{ $eq: ['$status', 'DONE'] }, 1, 0],
            },
          },
        },
      },
    ]);

    const counts: ProjectCounts = aggregate
      ? { pending: aggregate.pending, done: aggregate.done }
      : { pending: 0, done: 0 };

    return NextResponse.json(serializeProject(project, counts));
  }
);

export const runtime = 'nodejs';

