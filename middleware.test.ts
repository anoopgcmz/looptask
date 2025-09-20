import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from './middleware';
import { getToken } from 'next-auth/jwt';

vi.mock('next-auth/jwt', () => ({
  getToken: vi.fn(),
}));

describe('middleware', () => {
  beforeEach(() => {
    vi.mocked(getToken).mockReset();
  });

  const createRequest = (pathname: string) =>
    new NextRequest(new URL(`https://example.com${pathname}`));

  it('allows public register page without a session', async () => {
    vi.mocked(getToken).mockResolvedValue(null);

    const response = await middleware(createRequest('/register'));

    expect(response.status).toBe(200);
  });

  it('allows public register api without a session', async () => {
    vi.mocked(getToken).mockResolvedValue(null);

    const response = await middleware(createRequest('/api/register'));

    expect(response.status).toBe(200);
  });

  it('redirects to login when hitting a protected page without a session', async () => {
    vi.mocked(getToken).mockResolvedValue(null);

    const response = await middleware(createRequest('/dashboard'));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/login');
  });

  it('lets authenticated users access protected pages', async () => {
    vi.mocked(getToken).mockResolvedValue({ sub: 'user' });

    const response = await middleware(createRequest('/dashboard'));

    expect(response.status).toBe(200);
  });
});
