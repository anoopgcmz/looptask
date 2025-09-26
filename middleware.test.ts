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

  const protectedPaths = [
    '/dashboard',
    '/tasks',
    '/tasks/123',
    '/tasks/123/edit',
    '/profile',
    '/settings',
  ];

  it.each(protectedPaths)(
    'redirects to login when hitting %s without a session',
    async (path) => {
      vi.mocked(getToken).mockResolvedValue(null);

      const response = await middleware(createRequest(path));

      expect(response.status).toBe(307);
      const location = response.headers.get('location');
      expect(location).toBeTruthy();
      expect(location).toContain('/login');
    }
  );

  it.each(protectedPaths)(
    'allows authenticated users to access %s',
    async (path) => {
      vi.mocked(getToken).mockResolvedValue({ sub: 'user' });

      const response = await middleware(createRequest(path));

      expect(response.status).toBe(200);
    }
  );

  it('allows admin login page without a session', async () => {
    vi.mocked(getToken).mockResolvedValue(null);

    const response = await middleware(createRequest('/admin/login'));

    expect(response.status).toBe(200);
  });

  const adminProtectedPaths = ['/admin', '/admin/users', '/admin/users/new'];

  it.each(adminProtectedPaths)(
    'redirects to admin login when hitting %s without a session',
    async (path) => {
      vi.mocked(getToken).mockResolvedValue(null);

      const response = await middleware(createRequest(path));

      expect(response.status).toBe(307);
      const location = response.headers.get('location');
      expect(location).toBeTruthy();
      expect(location).toContain('/admin/login');
    }
  );

  it.each(adminProtectedPaths)(
    'allows authenticated users to access %s',
    async (path) => {
      vi.mocked(getToken).mockResolvedValue({ sub: 'user' });

      const response = await middleware(createRequest(path));

      expect(response.status).toBe(200);
    }
  );
});
