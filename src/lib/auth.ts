import NextAuth from 'next-auth';
import type { NextAuthOptions } from 'next-auth';
import { getServerSession } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { signIn as signInBase } from 'next-auth/react';
import { sha256 } from '@/lib/hash';
import dbConnect from '@/lib/db';
import User from '@/models/User';

interface AuthUser {
  id: string;
  email: string;
  organizationId?: string;
  teamId?: string;
  role?: string;
}

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      authorize: async (credentials): Promise<AuthUser | null> => {
        if (!credentials?.username || !credentials.password) return null;
        await dbConnect();
        const user = await User.findOne({ username: credentials.username });
        if (!user) return null;
        const hashed = await sha256(credentials.password);
        if (user.password !== hashed) return null;
        return {
          id: user._id.toString(),
          email: user.email,
          organizationId: user.organizationId?.toString(),
          teamId: user.teamId?.toString(),
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.email = user.email;
        token.organizationId = user.organizationId;
        token.teamId = user.teamId;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      session.userId = token.userId;
      session.email = token.email;
      session.organizationId = token.organizationId;
      session.teamId = token.teamId;
      session.role = token.role;
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };

export const auth = () => getServerSession(authOptions);

export const signIn = signInBase;
