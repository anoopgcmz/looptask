import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { verifyAndConsumeOtp } from '@/lib/otp';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { signIn } from '@/lib/auth';

export async function POST(req: Request) {
  const { email, code } = await req.json();
  if (!email || !code) {
    return NextResponse.json(
      {
        type: 'https://example.com/otp/invalid-request',
        title: 'Invalid request',
        status: 400,
        detail: 'Email and code are required',
      },
      { status: 400 }
    );
  }
  const result = await verifyAndConsumeOtp(email, code);
  if (!result.valid) {
    const detailMap: Record<string, string> = {
      invalid: 'The provided code is invalid.',
      expired: 'The code has expired.',
      attempts: 'Too many invalid attempts.',
    };
    const status = result.reason === 'attempts' ? 429 : 400;
    return NextResponse.json(
      {
        type: `https://example.com/otp/${result.reason}`,
        title: 'OTP verification failed',
        status,
        detail: detailMap[result.reason ?? 'invalid'],
      },
      { status }
    );
  }
  await dbConnect();
  await User.updateOne(
    { email },
    {
      $setOnInsert: {
        name: email.split('@')[0],
        email,
        username: email,
        password: createHash('sha256').update('changeme').digest('hex'),
      },
    },
    { upsert: true }
  );
  return signIn('credentials', { email, otpVerified: true, redirectTo: '/tasks' });
}
