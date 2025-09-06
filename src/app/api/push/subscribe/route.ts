import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/db';
import User from '@/models/User';

const bodySchema = z.object({
  subscription: z.any(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }

  await dbConnect();
  await User.updateOne(
    { _id: session.userId },
    { $addToSet: { pushSubscriptions: body.subscription } }
  );
  return NextResponse.json({ ok: true });
}
