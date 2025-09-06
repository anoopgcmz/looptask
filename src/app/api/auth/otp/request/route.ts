import { NextResponse, type NextRequest } from 'next/server';
import { generateOtp, createOtpToken, checkRateLimit } from '@/lib/otp';
import { sendOtpEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) {
    return NextResponse.json(
      {
        type: 'https://example.com/otp/invalid-request',
        title: 'Invalid request',
        status: 400,
        detail: 'Email is required',
      },
      { status: 400 }
    );
  }
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const emailAllowed = await checkRateLimit(`otp:email:${email}`);
  const ipAllowed = await checkRateLimit(`otp:ip:${ip}`);
  if (!emailAllowed || !ipAllowed) {
    return NextResponse.json(
      {
        type: 'https://example.com/otp/rate-limit',
        title: 'Rate limit exceeded',
        status: 429,
        detail: 'Too many requests. Try again later.',
      },
      { status: 429 }
    );
  }
  const code = generateOtp();
  try {
    await createOtpToken(email, ip, code);
  } catch {
    return NextResponse.json(
      {
        type: 'https://example.com/otp/cooldown',
        title: 'Cooldown active',
        status: 429,
        detail: 'Please wait before requesting another code.',
      },
      { status: 429 }
    );
  }
  await sendOtpEmail(email, code);
  return NextResponse.json({ ok: true });
}
