import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('mongoose', () => ({
  Types: { ObjectId: { isValid: () => true } },
}));

vi.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: ResponseInit) =>
      new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        ...init,
      }),
  },
}));

vi.mock('@/lib/db', () => ({ default: vi.fn() }));

const auth = vi.hoisted(() => vi.fn());
vi.mock('@/lib/auth', () => ({ auth }));

const findOneAndUpdate = vi.hoisted(() => vi.fn());
vi.mock('@/models/Notification', () => ({ Notification: { findOneAndUpdate } }));

import { POST } from './route';

describe('POST /notifications/:id/read', () => {
  const id = '507f1f77bcf86cd799439011';
  const session = { userId: '507f1f77bcf86cd799439012' } as unknown;

  beforeEach(() => {
    auth.mockResolvedValue(session);
    findOneAndUpdate.mockReset();
    findOneAndUpdate.mockResolvedValue({ _id: id });
  });

  it('marks notification read by default', async () => {
    const res = await POST(
      new Request('http://test', { method: 'POST' }) as unknown,
      { params: Promise.resolve({ id }) }
    );
    expect(res.status).toBe(200);
    expect(findOneAndUpdate).toHaveBeenCalledWith(
      { _id: id, userId: session.userId },
      { read: true, readAt: expect.any(Date) },
      { new: true }
    );
  });

  it('marks notification unread when read is false', async () => {
    const req = new Request('http://test', {
      method: 'POST',
      body: JSON.stringify({ read: false }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req as unknown, { params: Promise.resolve({ id }) });
    expect(res.status).toBe(200);
    expect(findOneAndUpdate).toHaveBeenCalledWith(
      { _id: id, userId: session.userId },
      { read: false, readAt: null },
      { new: true }
    );
  });
});

