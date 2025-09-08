import { NextResponse, type NextRequest } from 'next/server';
import { verifyAndConsumeOtp } from '@/lib/otp';
import dbConnect from '@/lib/db';
import { User } from '@/models/User';
import { signIn } from '@/lib/auth';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

export async function POST(req: NextRequest) {
  const { email, code } = (await req.json()) as {
    email?: string;
    code?: string;
  };
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
  const [namePart] = email.split('@');
  await User.updateOne(
    { email },
    {
      $setOnInsert: {
        name: namePart,
        email,
        username: email,
        password: await bcrypt.hash('changeme', SALT_ROUNDS),
      },
    },
    { upsert: true }
  );
  await signIn('credentials', {
    email,
    otpVerified: true,
    callbackUrl: '/tasks',
    redirect: false,
  });
  return NextResponse.redirect(new URL('/tasks', req.url));
}

export const runtime = 'nodejs';
