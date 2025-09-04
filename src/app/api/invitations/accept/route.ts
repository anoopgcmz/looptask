import { NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import dbConnect from '@/lib/db';
import Invitation from '@/models/Invitation';
import User from '@/models/User';
import { problem } from '@/lib/http';
import { Types } from 'mongoose';

const acceptSchema = z.object({
  token: z.string(),
  name: z.string(),
  password: z.string(),
});

export async function POST(req: Request) {
  let body: z.infer<typeof acceptSchema>;
  try {
    body = acceptSchema.parse(await req.json());
  } catch (e: any) {
    return problem(400, 'Invalid request', e.message);
  }

  const tokenHash = crypto.createHash('sha256').update(body.token).digest('hex');
  await dbConnect();
  const invite = await Invitation.findOne({ tokenHash }).lean();
  if (!invite || invite.used || invite.expiresAt < new Date()) {
    return problem(400, 'Invalid request', 'Invalid or expired token');
  }

  const username = invite.email.split('@')[0];
  try {
    const user = await User.create({
      name: body.name,
      email: invite.email,
      username,
      password: body.password,
      organizationId: new Types.ObjectId(invite.organizationId),
      role: invite.role,
    });
    await Invitation.updateOne({ _id: invite._id }, { $set: { used: true } });
    return NextResponse.json({ id: user._id }, { status: 201 });
  } catch (e: any) {
    if (e.code === 11000) {
      return problem(409, 'Conflict', 'User already exists');
    }
    if (e.name === 'ValidationError') {
      return problem(400, 'Invalid request', e.message);
    }
    return problem(500, 'Internal Server Error', 'Unexpected error');
  }
}
