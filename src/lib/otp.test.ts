import { describe, it, expect, beforeEach, vi } from 'vitest';
import crypto from 'crypto';
import {
  generateOtp,
  hashOtp,
  verifyOtp,
  createOtpToken,
  verifyAndConsumeOtp,
} from './otp';

vi.mock('@/lib/db', () => ({ default: vi.fn() }));

const tokens: any[] = [];
vi.mock('@/models/OtpToken', () => ({
  default: {
    findOne: vi.fn(async (query: any) =>
      tokens.filter((t) => t.email === query.email).sort((a, b) => b.createdAt - a.createdAt)[0] || null
    ),
    create: vi.fn(async (doc: any) => {
      tokens.push({ ...doc, attempts: 0, createdAt: new Date() });
    }),
    deleteMany: vi.fn(async (query: any) => {
      for (let i = tokens.length - 1; i >= 0; i--) {
        if (tokens[i].email === query.email) tokens.splice(i, 1);
      }
    }),
  },
}));

const rates = new Map<string, any>();
vi.mock('@/models/RateLimit', () => ({
  default: {
    findOne: vi.fn(async ({ key }: any) => rates.get(key) || null),
    updateOne: vi.fn(async ({ key }: any, update: any, opts?: any) => {
      const record = rates.get(key);
      if (opts?.upsert && (!record || record.windowEndsAt < new Date())) {
        rates.set(key, { key, ...(update.$set || {}) });
        return;
      }
      if (update.$inc && record) {
        record.count += update.$inc.count;
      }
    }),
  },
}));

describe('otp helpers', () => {
  beforeEach(() => {
    tokens.length = 0;
    rates.clear();
  });

  it('generates a 6-digit code using crypto.randomInt', () => {
    const spy = vi.spyOn(crypto, 'randomInt').mockReturnValue(42);
    const otp = generateOtp();
    expect(spy).toHaveBeenCalledWith(0, 1_000_000);
    expect(otp).toBe('000042');
    spy.mockRestore();
  });

  it('hashes and verifies codes', () => {
    const code = '123456';
    const hash = hashOtp(code);
    expect(verifyOtp(code, hash)).toBe(true);
    expect(verifyOtp('000000', hash)).toBe(false);
  });

  it('creates and verifies token', async () => {
    const email = 'user@example.com';
    await createOtpToken(email, '127.0.0.1', '111111');
    const result = await verifyAndConsumeOtp(email, '111111');
    expect(result.valid).toBe(true);
    const second = await verifyAndConsumeOtp(email, '111111');
    expect(second.valid).toBe(false);
  });
});
