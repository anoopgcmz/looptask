import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { Types } from 'mongoose';
import dbConnect from '@/lib/db';
import { withOrganization } from '@/lib/middleware/withOrganization';
import { problem } from '@/lib/http';
import { Project } from '@/models/Project';
import type { IProject } from '@/models/Project';
import { ProjectType } from '@/models/ProjectType';
import { Task } from '@/models/Task';

interface ProjectCounts {
  pending: number;
  done: number;
}

const createProjectSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  description: z.string().optional(),
  typeId: z.string().optional(),
});

const listQuerySchema = z.object({
  typeId: z.string().optional(),
});

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

export const GET = withOrganization(async (req: NextRequest, session) => {
  const url = new URL(req.url);
  let query: z.infer<typeof listQuerySchema>;
  try {
    query = listQuerySchema.parse({
      typeId: url.searchParams.get('typeId') ?? undefined,
    });
  } catch (e: unknown) {
    const err = e as Error;
    return problem(400, 'Invalid request', err.message);
  }

  const orgId = new Types.ObjectId(session.organizationId);
  let typeId: Types.ObjectId | undefined;
  if (query.typeId) {
    if (!Types.ObjectId.isValid(query.typeId)) {
      return problem(400, 'Invalid request', 'typeId is invalid');
    }
    typeId = new Types.ObjectId(query.typeId);
  }

  await dbConnect();

  const projectFilter: Record<string, unknown> = { organizationId: orgId };
  if (typeId) projectFilter.type = typeId;

  const projects = await Project.find(projectFilter).sort({ createdAt: -1 });
  const projectIds = projects.map((project) => project._id as Types.ObjectId);

  const stats = new Map<string, ProjectCounts>();
  if (projectIds.length) {
    const aggregates = await Task.aggregate<{ _id: Types.ObjectId; pending: number; done: number }>([
      {
        $match: {
          organizationId: orgId,
          projectId: { $in: projectIds },
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
    aggregates.forEach((aggregate) => {
      stats.set(aggregate._id.toString(), {
        pending: aggregate.pending,
        done: aggregate.done,
      });
    });
  }

  const response = projects.map((project) =>
    serializeProject(project, stats.get(project._id.toString()) ?? { pending: 0, done: 0 })
  );

  return NextResponse.json(response);
});

export const POST = withOrganization(async (req: NextRequest, session) => {
  let body: z.infer<typeof createProjectSchema>;
  try {
    body = createProjectSchema.parse(await req.json());
  } catch (e: unknown) {
    const err = e as Error;
    return problem(400, 'Invalid request', err.message);
  }

  await dbConnect();

  const orgId = new Types.ObjectId(session.organizationId);
  const userId = new Types.ObjectId(session.userId);
  let typeId: Types.ObjectId | undefined;
  if (body.typeId) {
    if (!Types.ObjectId.isValid(body.typeId)) {
      return problem(400, 'Invalid request', 'typeId is invalid');
    }
    typeId = new Types.ObjectId(body.typeId);
    const type = await ProjectType.findOne({
      _id: typeId,
      organizationId: orgId,
    });
    if (!type) {
      return problem(400, 'Invalid request', 'Project type must be in your organization');
    }
  }

  const project = await Project.create({
    organizationId: orgId,
    name: body.name.trim(),
    description: body.description,
    type: typeId,
    createdBy: userId,
    updatedBy: userId,
  });

  return NextResponse.json(serializeProject(project, { pending: 0, done: 0 }), {
    status: 201,
  });
});

export const runtime = 'nodejs';

