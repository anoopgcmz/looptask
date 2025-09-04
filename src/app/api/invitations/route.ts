import { NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import dbConnect from '@/lib/db';
import { auth } from '@/lib/auth';
import { problem } from '@/lib/http';
import Invitation from '@/models/Invitation';
import { sendInvitationEmail } from '@/lib/email';
import { Types } from 'mongoose';

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['ADMIN', 'USER']).optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.userId || !session.organizationId) {
    return problem(401, 'Unauthorized', 'You must be signed in.');
  }
  if (session.role !== 'ADMIN') {
    return problem(403, 'Forbidden', 'Admin access required.');
  }

  let body: z.infer<typeof inviteSchema>;
  try {
    body = inviteSchema.parse(await req.json());
  } catch (e: any) {
    return problem(400, 'Invalid request', e.message);
  }

  const token = crypto.randomBytes(20).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await dbConnect();
  await Invitation.create({
    email: body.email,
    organizationId: new Types.ObjectId(session.organizationId),
    tokenHash,
    role: body.role || 'USER',
    expiresAt,
  });

  const origin = req.headers.get('origin') || '';
  const link = `${origin}/invite/${token}`;
  await sendInvitationEmail(body.email, link);

  return NextResponse.json({ ok: true }, { status: 201 });
}
