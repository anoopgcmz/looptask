import NextAuth from 'next-auth';
import type { NextAuthOptions } from 'next-auth';
import { getServerSession } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { signIn as signInBase } from 'next-auth/react';
import bcrypt from 'bcrypt';
import dbConnect from '@/lib/db';
import User from '@/models/User';

interface AuthUser {
  id: string;
  email: string;
  organizationId?: string | undefined;
  teamId?: string | undefined;
  role?: string | undefined;
}

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      authorize: async (credentials): Promise<AuthUser | null> => {
        if (!credentials?.email) return null;
        if (!credentials.password && !credentials.otpVerified) return null;
        await dbConnect();
        const user = await User.findOne({ email: credentials.email });
        if (!user) return null;
        if (!credentials.otpVerified) {
          const match = await bcrypt.compare(credentials.password!, user.password);
          if (!match) return null;
        }
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
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.email = user.email;
        if (user.organizationId) token.organizationId = user.organizationId;
        if (user.teamId) token.teamId = user.teamId;
        if (user.role) token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      session.userId = token.userId;
      session.email = token.email;
      if (token.organizationId) session.organizationId = token.organizationId;
      if (token.teamId) session.teamId = token.teamId;
      if (token.role) session.role = token.role;
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };

export const auth = () => getServerSession(authOptions);

export const signIn = signInBase;
