import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { sendPushToUser } from '@/lib/push';

const bodySchema = z.object({
  userId: z.string(),
  title: z.string(),
  body: z.string(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let data: z.infer<typeof bodySchema>;
  try {
    data = bodySchema.parse(await req.json());
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
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
