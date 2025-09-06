import { NextResponse } from 'next/server';
import { z } from 'zod';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { auth } from '@/lib/auth';
import { problem } from '@/lib/http';

export async function GET() {
  const session = await auth();
  if (!session?.userId) {
    return problem(401, 'Unauthorized', 'You must be signed in.');
  }
  await dbConnect();
  const user = await User.findById(session.userId)
    .select('notificationSettings')
    .lean();
  if (!user) {
    return problem(404, 'Not found', 'User not found.');
  }
  const prefs =
    user.notificationSettings ||
    { email: true, push: true, digestFrequency: 'daily' };
  return NextResponse.json(prefs);
}

const updateSchema = z.object({
  email: z.boolean().optional(),
  push: z.boolean().optional(),
  digestFrequency: z.enum(['daily', 'weekly']).optional(),
});

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.userId) {
    return problem(401, 'Unauthorized', 'You must be signed in.');
  }
  let body: z.infer<typeof updateSchema>;
  try {
    body = updateSchema.parse(await req.json());
  } catch (e: any) {
    return problem(400, 'Invalid request', e.message);
  }
  await dbConnect();
  try {
    const user = await User.findByIdAndUpdate(
      session.userId,
      { notificationSettings: body },
      { new: true, runValidators: true }
    )
      .select('notificationSettings')
      .lean();
    if (!user) {
      return problem(404, 'Not found', 'User not found.');
    }
    return NextResponse.json(user.notificationSettings);
  } catch (e: any) {
    return problem(400, 'Invalid request', e.message);
  }
}
