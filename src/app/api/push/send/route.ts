import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { User } from '@/models/User';
import { sendPushToUser } from '@/lib/push';

const bodySchema = z.object({
  userId: z.string(),
  title: z.string(),
  body: z.string(),
});

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let data: z.infer<typeof bodySchema>;
  try {
    data = bodySchema.parse(await req.json());
  } catch (e: unknown) {
    const err = e as Error;
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  await dbConnect();
  const user = await User.findById(data.userId);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  if (user.notificationSettings?.push === false) {
    return NextResponse.json({ ok: true });
  }

  await sendPushToUser(user, { title: data.title, body: data.body });
  return NextResponse.json({ ok: true });
}
