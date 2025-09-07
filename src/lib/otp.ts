import crypto from 'crypto';
import dbConnect from '@/lib/db';
import { OtpToken } from '@/models/OtpToken';
import { RateLimit } from '@/models/RateLimit';

const OTP_EXPIRY_MINUTES = 10;
const RESEND_COOLDOWN = 60; // seconds
const MAX_REQUESTS_PER_HOUR = 5;
const MAX_ATTEMPTS = 5;

export function generateOtp(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
}

export function hashOtp(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

export function verifyOtp(code: string, hash: string): boolean {
  return hashOtp(code) === hash;
}

export async function checkRateLimit(key: string): Promise<boolean> {
  await dbConnect();
  const now = new Date();
  const windowEndsAt = new Date(now.getTime() + 60 * 60 * 1000);
  const record = await RateLimit.findOne({ key });
  if (!record || record.windowEndsAt < now) {
    await RateLimit.updateOne(
      { key },
      { $set: { count: 1, windowEndsAt } },
      { upsert: true }
    );
    return true;
  }
  if (record.count >= MAX_REQUESTS_PER_HOUR) {
    return false;
  }
  await RateLimit.updateOne({ key }, { $inc: { count: 1 } });
  return true;
}

export async function createOtpToken(email: string, ip: string, code: string) {
  await dbConnect();
  const latest = await OtpToken.findOne({ email }).sort({ createdAt: -1 });
  if (latest && Date.now() - latest.createdAt.getTime() < RESEND_COOLDOWN * 1000) {
    throw new Error('cooldown');
  }
  const codeHash = hashOtp(code);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
  await OtpToken.create({ email, codeHash, ip, expiresAt });
}

export async function verifyAndConsumeOtp(
  email: string,
  code: string
): Promise<{ valid: boolean; reason?: string }> {
  await dbConnect();
  const token = await OtpToken.findOne({ email }).sort({ createdAt: -1 });
  if (!token) return { valid: false, reason: 'invalid' };
  if (token.expiresAt < new Date()) {
    await OtpToken.deleteMany({ email });
    return { valid: false, reason: 'expired' };
  }
  if (token.attempts >= MAX_ATTEMPTS) {
    return { valid: false, reason: 'attempts' };
  }
  const match = verifyOtp(code, token.codeHash);
  if (!match) {
    token.attempts += 1;
    await token.save();
    if (token.attempts >= MAX_ATTEMPTS) {
      return { valid: false, reason: 'attempts' };
    }
    return { valid: false, reason: 'invalid' };
  }
  await OtpToken.deleteMany({ email });
  return { valid: true };
}

