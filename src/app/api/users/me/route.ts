import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import dbConnect from '@/lib/db';
import { User } from '@/models/User';
import { auth } from '@/lib/auth';
import { problem } from '@/lib/http';

export async function GET() {
  const session = await auth();
  if (!session?.userId) {
    return problem(401, 'Unauthorized', 'You must be signed in.');
  }
  await dbConnect();
  const user = await User.findById(session.userId)
    .select('name email username avatar timezone')
    .lean();
  if (!user) {
    return problem(404, 'Not found', 'User not found.');
  }
  return NextResponse.json(user);
}

const updateSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  username: z.string().optional(),
  avatar: z.string().url().optional(),
  timezone: z.string().optional(),
});

export const runtime = 'nodejs';

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.userId) {
    return problem(401, 'Unauthorized', 'You must be signed in.');
  }
  let body: z.infer<typeof updateSchema>;
  try {
    body = updateSchema.parse(await req.json());
  } catch (e: unknown) {
    const err = e as Error;
    return problem(400, 'Invalid request', err.message);
  }
  await dbConnect();
  try {
    const user = await User.findByIdAndUpdate(session.userId, body, {
      new: true,
      runValidators: true,
    })
      .select('name email username avatar timezone')
      .lean();
    if (!user) {
      return problem(404, 'Not found', 'User not found.');
    }
    return NextResponse.json(user);
  } catch (e: unknown) {
    const err = e as Error;
    return problem(400, 'Invalid request', err.message);
  }
}
