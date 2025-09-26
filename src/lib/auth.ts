import NextAuth from 'next-auth';
import type { NextAuthOptions, RequestInternal } from 'next-auth';
import { getServerSession } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { signIn as signInBase } from 'next-auth/react';
import { encode } from 'next-auth/jwt';
import type { JWT } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { Types } from 'mongoose';
import dbConnect from '@/lib/db';
import { User } from '@/models/User';
import { RefreshToken, type ClientMetadata } from '@/models/RefreshToken';
import type { UserRole } from '@/lib/roles';

declare global {
  var __NEXTAUTH_SECRET: string | undefined;
}

interface AuthUser {
  id: string;
  email: string;
  organizationId?: string | undefined;
  teamId?: string | undefined;
  role?: UserRole | undefined;
  client?: ClientMetadata;
}

interface CredentialsPayload {
  email?: string;
  password?: string;
  otpVerified?: boolean;
}

interface ExtendedToken extends JWT {
  accessToken?: string;
  accessTokenExpires?: number;
  refreshToken?: string;
  refreshTokenId?: string;
  error?: 'RefreshTokenExpired' | 'RefreshTokenInvalid';
}

const ACCESS_TOKEN_TTL_SECONDS = 5 * 60; // 5 minutes
const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

const ensureSecret = () => {
  const secret = process.env.NEXTAUTH_SECRET;
  if (secret) {
    return secret;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('NEXTAUTH_SECRET is not configured.');
  }
  if (!globalThis.__NEXTAUTH_SECRET) {
    globalThis.__NEXTAUTH_SECRET = crypto.randomBytes(32).toString('hex');
  }
  return globalThis.__NEXTAUTH_SECRET;
};

const hashRefreshToken = (token: string) =>
  crypto.createHash('sha256').update(token).digest('hex');

const getHeaderValue = (
  headers: RequestInternal['headers'] | undefined,
  key: string
): string | undefined => {
  if (!headers) return undefined;
  if (typeof (headers as Headers | undefined)?.get === 'function') {
    const headerValue = (headers as Headers).get(key);
    return headerValue ?? undefined;
  }
  const headerRecord = headers as Record<string, unknown>;
  const value = headerRecord[key];
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      if (typeof entry === 'string') {
        return entry;
      }
    }
    return undefined;
  }
  return undefined;
};

const createAccessToken = async (user: AuthUser) =>
  encode({
    token: {
      userId: user.id,
      sub: user.id,
      email: user.email,
      organizationId: user.organizationId,
      teamId: user.teamId,
      role: user.role,
    },
    secret: ensureSecret(),
    maxAge: ACCESS_TOKEN_TTL_SECONDS,
  });

const createRefreshToken = async (
  userId: string,
  client: ClientMetadata = {}
): Promise<{ token: string; recordId: string }> => {
  await dbConnect();
  const raw = crypto.randomBytes(48).toString('hex');
  const hashed = hashRefreshToken(raw);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);
  const record = await RefreshToken.create({
    user: userId,
    hashedToken: hashed,
    expiresAt,
    client,
  });
  return { token: raw, recordId: record._id.toString() };
};

type RotateResult =
  | { status: 'ok'; token: string; recordId: string }
  | { status: 'expired' }
  | { status: 'invalid' };

const rotateRefreshToken = async (
  token: string,
  tokenId: string
): Promise<RotateResult> => {
  await dbConnect();
  const hashed = hashRefreshToken(token);
  const existing = await RefreshToken.findOne({
    _id: tokenId,
    hashedToken: hashed,
  });
  if (!existing) {
    return { status: 'invalid' };
  }
  if (existing.revokedAt) {
    return { status: 'invalid' };
  }
  if (existing.expiresAt.getTime() <= Date.now()) {
    await existing.deleteOne();
    return { status: 'expired' };
  }
  const client = (existing.client ?? {}) as ClientMetadata;
  const { token: newToken, recordId } = await createRefreshToken(
    existing.user.toString(),
    client
  );
  existing.revokedAt = new Date();
  existing.replacedBy = new Types.ObjectId(recordId);
  await existing.save();
  return { status: 'ok', token: newToken, recordId };
};

const deleteRefreshToken = async (token: string | undefined, id: string | undefined) => {
  if (!token || !id) return;
  await dbConnect();
  const hashed = hashRefreshToken(token);
  await RefreshToken.findOneAndDelete({ _id: id, hashedToken: hashed });
};

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      authorize: async (
        credentials,
        req
      ): Promise<AuthUser | null> => {
        const credentialPayload = credentials as CredentialsPayload | undefined;
        const email = credentialPayload?.email;
        if (!email) return null;
        const otpVerified = credentialPayload?.otpVerified === true;
        const password = credentialPayload?.password;
        if (!password && !otpVerified) return null;
        await dbConnect();
        const user = await User.findOne({ email });
        if (!user) return null;
        if (!otpVerified) {
          const match = await bcrypt.compare(password!, user.password);
          if (!match) return null;
        }
        const client: ClientMetadata = {};
        const userAgent = getHeaderValue(req?.headers, 'user-agent');
        if (userAgent) client.userAgent = userAgent;
        const forwardedFor = getHeaderValue(req?.headers, 'x-forwarded-for');
        if (forwardedFor) {
          const [ipCandidate] = forwardedFor.split(',');
          if (ipCandidate) {
            client.ip = ipCandidate.trim();
          }
        }
        return {
          id: user._id.toString(),
          email: user.email,
          organizationId: user.organizationId?.toString(),
          teamId: user.teamId?.toString(),
          role: user.role,
          client,
        };
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      const extended = token as ExtendedToken;
      if (user) {
        const authUser = user as AuthUser;
        extended.userId = authUser.id;
        extended.email = authUser.email;
        extended.organizationId = authUser.organizationId;
        extended.teamId = authUser.teamId;
        extended.role = authUser.role;
        extended.accessToken = await createAccessToken(authUser);
        extended.accessTokenExpires = Date.now() + ACCESS_TOKEN_TTL_SECONDS * 1000;
        const clientMetadata: ClientMetadata = authUser.client ?? {};
        const { token: refreshToken, recordId } = await createRefreshToken(
          authUser.id,
          clientMetadata
        );
        extended.refreshToken = refreshToken;
        extended.refreshTokenId = recordId;
        delete extended.error;
        return extended;
      }

      if (trigger === 'update') {
        return extended;
      }

      if (extended.accessToken && extended.accessTokenExpires) {
        if (Date.now() < extended.accessTokenExpires) {
          return extended;
        }
      }

      if (!extended.refreshToken || !extended.refreshTokenId) {
        extended.error = 'RefreshTokenInvalid';
        return extended;
      }

      const rotated = await rotateRefreshToken(
        extended.refreshToken,
        extended.refreshTokenId
      );

      if (rotated.status !== 'ok') {
        delete extended.refreshToken;
        delete extended.refreshTokenId;
        delete extended.accessToken;
        delete extended.accessTokenExpires;
        extended.error =
          rotated.status === 'expired'
            ? 'RefreshTokenExpired'
            : 'RefreshTokenInvalid';
        return extended;
      }

      extended.accessToken = await createAccessToken({
        id: extended.userId,
        email: extended.email,
        organizationId: extended.organizationId,
        teamId: extended.teamId,
        role: extended.role,
      });
      extended.accessTokenExpires = Date.now() + ACCESS_TOKEN_TTL_SECONDS * 1000;
      extended.refreshToken = rotated.token;
      extended.refreshTokenId = rotated.recordId;
      delete extended.error;
      return extended;
    },
    async session({ session, token }) {
      const extended = token as ExtendedToken;
      session.userId = extended.userId;
      session.email = extended.email;
      if (extended.organizationId) session.organizationId = extended.organizationId;
      if (extended.teamId) session.teamId = extended.teamId;
      if (extended.role) session.role = extended.role;
      if (extended.accessToken) session.accessToken = extended.accessToken;
      if (extended.accessTokenExpires) {
        session.accessTokenExpires = extended.accessTokenExpires;
      }
      if (extended.refreshToken) session.refreshToken = extended.refreshToken;
      if (extended.error) session.error = extended.error;
      return session;
    },
  },
  events: {
    async signOut({ token }) {
      const extended = token as ExtendedToken | undefined;
      if (!extended) return;
      await deleteRefreshToken(extended.refreshToken, extended.refreshTokenId);
    },
  },
};

type NextAuthRouteHandler = (req: NextRequest) => Promise<Response>;

const handler = NextAuth(authOptions) as NextAuthRouteHandler;
export { handler as GET, handler as POST };

export const auth = () => getServerSession(authOptions);

export const signIn = signInBase;
