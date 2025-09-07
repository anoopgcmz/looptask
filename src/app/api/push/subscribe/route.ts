import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/db';
import User from '@/models/User';

const subscriptionSchema = z.object({
  endpoint: z.string(),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
});

const bodySchema = z.object({
  subscription: subscriptionSchema,
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { subscription: z.infer<typeof subscriptionSchema> };
  try {
    body = bodySchema.parse(await req.json());
  } catch (e: unknown) {
    const err = e as Error;
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  await dbConnect();
  await User.updateOne(
    { _id: session.userId },
    { $addToSet: { pushSubscriptions: body.subscription } }
  );
  return NextResponse.json({ ok: true });
}
