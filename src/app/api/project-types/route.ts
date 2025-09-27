import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { Types } from 'mongoose';
import dbConnect from '@/lib/db';
import { withOrganization } from '@/lib/middleware/withOrganization';
import { problem } from '@/lib/http';
import { ProjectType } from '@/models/ProjectType';
import type { IProjectType } from '@/models/ProjectType';

const createTypeSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
});

function serializeType(
  type: IProjectType & { _id: Types.ObjectId; createdAt: Date; updatedAt: Date }
) {
  return {
    _id: type._id.toString(),
    organizationId: type.organizationId.toString(),
    name: type.name,
    createdBy: type.createdBy.toString(),
    updatedBy: type.updatedBy.toString(),
    createdAt: type.createdAt.toISOString(),
    updatedAt: type.updatedAt.toISOString(),
  };
}

export const GET = withOrganization(async (_req: NextRequest, session) => {
  await dbConnect();
  const types = await ProjectType.find({
    organizationId: new Types.ObjectId(session.organizationId),
  }).sort({ name: 1 });
  return NextResponse.json(types.map((type) => serializeType(type)));
});

export const POST = withOrganization(async (req: NextRequest, session) => {
  let body: z.infer<typeof createTypeSchema>;
  try {
    body = createTypeSchema.parse(await req.json());
  } catch (e: unknown) {
    const err = e as Error;
    return problem(400, 'Invalid request', err.message);
  }

  await dbConnect();

  const orgId = new Types.ObjectId(session.organizationId);
  const normalized = body.name.trim().toLowerCase();
  const existing = await ProjectType.findOne({
    organizationId: orgId,
    normalized,
  });
  if (existing) {
    return problem(409, 'Conflict', 'Project type already exists');
  }

  const userId = new Types.ObjectId(session.userId);
  const type = await ProjectType.create({
    organizationId: orgId,
    name: body.name.trim(),
    createdBy: userId,
    updatedBy: userId,
  });

  return NextResponse.json(serializeType(type), { status: 201 });
});

export const runtime = 'nodejs';

