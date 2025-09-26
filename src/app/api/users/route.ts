import { NextResponse, type NextRequest } from 'next/server';
import { Types, type FilterQuery } from 'mongoose';
import { z } from 'zod';
import dbConnect from '@/lib/db';
import { User, type IUser } from '@/models/User';
import { auth } from '@/lib/auth';
import { problem } from '@/lib/http';
import {
  USER_ROLE_VALUES,
  isElevatedAdminRole,
  isPlatformRole,
  isTenantAdminRole,
} from '@/lib/roles';

export async function GET(req: NextRequest) {
  const session = await auth();
  const isPlatform = isPlatformRole(session?.role);
  if (!session?.userId || (!isPlatform && !session.organizationId)) {
    return problem(401, 'Unauthorized', 'You must be signed in.');
  }
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || '';
  const ids = searchParams.getAll('id').filter((v) => v);
  const organizationIdParam = searchParams.get('organizationId');

  await dbConnect();

  const query: FilterQuery<IUser> = {};

  if (isPlatform) {
    if (organizationIdParam) {
      if (!Types.ObjectId.isValid(organizationIdParam)) {
        return problem(400, 'Invalid request', 'organizationId is invalid');
      }
      query.organizationId = new Types.ObjectId(organizationIdParam);
    } else if (session.organizationId && Types.ObjectId.isValid(session.organizationId)) {
      query.organizationId = new Types.ObjectId(session.organizationId);
    }
  } else {
    if (!session.organizationId || !Types.ObjectId.isValid(session.organizationId)) {
      return problem(400, 'Invalid request', 'organizationId is invalid');
    }
    query.organizationId = new Types.ObjectId(session.organizationId);
  }

  if (ids.length) {
    const parsedIds = ids
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));
    if (!parsedIds.length) {
      return NextResponse.json([]);
    }
    query._id = { $in: parsedIds };
  } else if (q) {
    query.$or = [
      { name: { $regex: q, $options: 'i' } },
      { email: { $regex: q, $options: 'i' } },
      { username: { $regex: q, $options: 'i' } },
    ];
  }

  const isElevatedAdmin = isElevatedAdminRole(session.role);
  const selection = isElevatedAdmin
    ? '-password -pushSubscriptions'
    : '_id name avatar teamId role';

  const users = await User.find(query).select(selection).lean();
  return NextResponse.json(users);
}

const createUserSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  username: z.string(),
  password: z.string(),
  organizationId: z.string().optional(),
  teamId: z.string().optional(),
  timezone: z.string().optional(),
  isActive: z.boolean().optional(),
  role: z.enum(USER_ROLE_VALUES).optional(),
  avatar: z.string().optional(),
  permissions: z.array(z.string()).optional(),
});

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const session = await auth();
  const isPlatform = isPlatformRole(session?.role);
  if (!session?.userId || (!isPlatform && !session.organizationId)) {
    return problem(401, 'Unauthorized', 'You must be signed in.');
  }
  if (!isPlatform && !isTenantAdminRole(session.role)) {
    return problem(403, 'Forbidden', 'Admin access required.');
  }
  let body: z.infer<typeof createUserSchema>;
  try {
    body = createUserSchema.parse(await req.json());
  } catch (e: unknown) {
    const err = e as Error;
    return problem(400, 'Invalid request', err.message);
  }
  if (!isPlatform && body.role === 'PLATFORM') {
    return problem(403, 'Forbidden', 'Cannot assign platform role.');
  }
  const targetOrganizationId = (() => {
    if (isPlatform) {
      return body.organizationId;
    }
    return session.organizationId;
  })();
  if (!targetOrganizationId) {
    return problem(400, 'Invalid request', 'organizationId is required');
  }
  if (!Types.ObjectId.isValid(targetOrganizationId)) {
    return problem(400, 'Invalid request', 'organizationId is invalid');
  }
  if (!isPlatform && body.organizationId && body.organizationId !== session.organizationId) {
    return problem(400, 'Invalid request', 'organizationId mismatch');
  }
  if (body.teamId && !Types.ObjectId.isValid(body.teamId)) {
    return problem(400, 'Invalid request', 'teamId is invalid');
  }
  await dbConnect();
  try {
    const { organizationId: _bodyOrgId, teamId, role, ...rest } = body;
    void _bodyOrgId;
    const user = await User.create({
      ...rest,
      role: role ?? 'USER',
      organizationId: new Types.ObjectId(targetOrganizationId),
      teamId: teamId ? new Types.ObjectId(teamId) : undefined,
    });
    return NextResponse.json(user, { status: 201 });
  } catch (e: unknown) {
    const err = e as Error & { code?: number };
    if (err.code === 11000) {
      return problem(409, 'Conflict', 'User already exists');
    }
    if (err.name === 'ValidationError') {
      return problem(400, 'Invalid request', err.message);
    }
    return problem(500, 'Internal Server Error', 'Unexpected error');
  }
}
