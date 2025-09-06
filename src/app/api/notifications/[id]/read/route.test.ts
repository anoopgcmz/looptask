import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Types } from 'mongoose';

vi.mock('@/lib/db', () => ({ default: vi.fn() }));

const auth = vi.fn();
vi.mock('@/lib/auth', () => ({ auth }));

const findOneAndUpdate = vi.fn();
vi.mock('@/models/Notification', () => ({ default: { findOneAndUpdate } }));

import { POST } from './route';

describe('POST /notifications/:id/read', () => {
  const id = new Types.ObjectId().toString();
  const session = { userId: new Types.ObjectId().toString() } as any;

  beforeEach(() => {
    auth.mockResolvedValue(session);
    findOneAndUpdate.mockReset();
    findOneAndUpdate.mockResolvedValue({ _id: id });
  });

  it('marks notification read by default', async () => {
    const res = await POST(new Request('http://test', { method: 'POST' }), { params: { id } });
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
    const res = await POST(req, { params: { id } });
    expect(res.status).toBe(200);
    expect(findOneAndUpdate).toHaveBeenCalledWith(
      { _id: id, userId: session.userId },
      { read: false, readAt: null },
      { new: true }
    );
  });
});

