import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { sha256 } from '@/lib/hash';
import dbConnect from '@/lib/db';
import User from '@/models/User';

interface AuthUser {
  id: string;
  email: string;
  organizationId?: string;
  teamId?: string;
  isAdmin?: boolean;
}

interface ExtendedToken {
  userId?: string;
  email?: string;
  organizationId?: string;
  teamId?: string;
  isAdmin?: boolean;
  [key: string]: unknown;
}

interface ExtendedSession {
  userId?: string;
  email?: string;
  organizationId?: string;
  teamId?: string;
  isAdmin?: boolean;
  [key: string]: unknown;
}

export const authOptions = {
  session: { strategy: 'jwt' },
  providers: [
    Credentials({
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
          isAdmin: user.isAdmin,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: { token: ExtendedToken; user?: AuthUser }) {
      if (user) {
        token.userId = user.id;
        token.email = user.email;
        token.organizationId = user.organizationId;
        token.teamId = user.teamId;
        token.isAdmin = user.isAdmin;
      }
      return token;
    },
    async session({ session, token }: { session: ExtendedSession; token: ExtendedToken }) {
      session.userId = token.userId;
      session.email = token.email;
      session.organizationId = token.organizationId;
      session.teamId = token.teamId;
      session.isAdmin = token.isAdmin;
      return session;
    },
  },
};

export const { handlers, auth, signIn } = NextAuth(authOptions);
export const { GET, POST } = handlers;
