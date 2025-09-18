import { NextResponse, type NextRequest } from 'next/server';
import { Types, type FilterQuery } from 'mongoose';
import { z } from 'zod';
import dbConnect from '@/lib/db';
import { User, type IUser } from '@/models/User';
import { auth } from '@/lib/auth';
import { problem } from '@/lib/http';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.userId || !session.organizationId) {
    return problem(401, 'Unauthorized', 'You must be signed in.');
  }
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || '';
  const ids = searchParams.getAll('id').filter((v) => v);

  await dbConnect();

  const query: FilterQuery<IUser> = {
    organizationId: new Types.ObjectId(session.organizationId),
  };

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

  const isAdmin = session.role === 'ADMIN';
  const selection = isAdmin
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
  role: z.enum(['ADMIN', 'USER']).optional(),
  avatar: z.string().optional(),
  permissions: z.array(z.string()).optional(),
});

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.userId || !session.organizationId) {
    return problem(401, 'Unauthorized', 'You must be signed in.');
  }
  if (session.role !== 'ADMIN') {
    return problem(403, 'Forbidden', 'Admin access required.');
  }
  let body: z.infer<typeof createUserSchema>;
  try {
    body = createUserSchema.parse(await req.json());
  } catch (e: unknown) {
    const err = e as Error;
    return problem(400, 'Invalid request', err.message);
  }
  if (body.organizationId && body.organizationId !== session.organizationId) {
    return problem(400, 'Invalid request', 'organizationId mismatch');
  }
  await dbConnect();
  try {
    const user = await User.create({
      ...body,
      organizationId: new Types.ObjectId(session.organizationId),
      teamId: body.teamId ? new Types.ObjectId(body.teamId) : undefined,
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
