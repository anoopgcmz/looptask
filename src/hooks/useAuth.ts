'use client';

import { useCallback, useMemo } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';
import type { Session } from 'next-auth';

type BaseUser = NonNullable<Session['user']>;

type AuthUser = BaseUser & {
  userId?: string;
  organizationId?: string;
  teamId?: string;
  role?: string;
  accessToken?: string;
  accessTokenExpires?: number;
  refreshToken?: string;
};

type LoginFn = typeof signIn;
type LogoutFn = typeof signOut;

interface UseAuthResult {
  status: ReturnType<typeof useSession>['status'];
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
  login: (...args: Parameters<LoginFn>) => ReturnType<LoginFn>;
  logout: (...args: Parameters<LogoutFn>) => ReturnType<LogoutFn>;
}

export default function useAuth(): UseAuthResult {
  const { data, status } = useSession();

  const user = useMemo<AuthUser | null>(() => {
    if (!data) return null;
    const baseUser = data.user ?? ({} as BaseUser);
    return {
      ...baseUser,
      email: data.email ?? baseUser.email,
      userId: data.userId,
      organizationId: data.organizationId,
      teamId: data.teamId,
      role: data.role,
      accessToken: data.accessToken,
      accessTokenExpires: data.accessTokenExpires,
      refreshToken: data.refreshToken,
    };
  }, [data]);

  const login = useCallback(
    (...args: Parameters<LoginFn>) => signIn(...args),
    []
  );

  const logout = useCallback(
    (...args: Parameters<LogoutFn>) => signOut(...args),
    []
  );

  return {
    status,
    user,
    isLoading: status === 'loading',
    error: data?.error ?? null,
    login,
    logout,
  };
}
