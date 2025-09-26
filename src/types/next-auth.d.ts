import 'next-auth';
import 'next-auth/jwt';
import type { UserRole } from '@/lib/roles';

declare module 'next-auth' {
  interface Session {
    userId: string;
    email: string;
    organizationId: string | undefined;
    teamId: string | undefined;
    role: UserRole | undefined;
    accessToken?: string;
    accessTokenExpires?: number;
    refreshToken?: string;
    error?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId: string;
    email: string;
    organizationId: string | undefined;
    teamId: string | undefined;
    role: UserRole | undefined;
    accessToken?: string;
    accessTokenExpires?: number;
    refreshToken?: string;
    refreshTokenId?: string;
    error?: string;
  }
}
