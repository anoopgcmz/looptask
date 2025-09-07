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

const tokens: unknown[] = [];
vi.mock('@/models/OtpToken', () => ({
  OtpToken: {
    findOne: vi.fn(async (query: unknown) =>
      tokens
        .filter((t) => t.email === query.email)
        .sort((a, b) => b.createdAt - a.createdAt)
        .at(0) || null
    ),
    create: vi.fn(async (doc: unknown) => {
      tokens.push({ ...doc, attempts: 0, createdAt: new Date() });
    }),
    deleteMany: vi.fn(async (query: unknown) => {
      for (let i = tokens.length - 1; i >= 0; i--) {
        if (tokens[i].email === query.email) tokens.splice(i, 1);
      }
    }),
  },
}));

const rates = new Map<string, unknown>();
vi.mock('@/models/RateLimit', () => ({
  RateLimit: {
    findOne: vi.fn(async ({ key }: unknown) => rates.get(key) || null),
    updateOne: vi.fn(async ({ key }: unknown, update: unknown, opts?: unknown) => {
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
