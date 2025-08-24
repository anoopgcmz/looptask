import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import dbConnect from '@/lib/db';
import User from '@/models/User';

interface AuthUser {
  id: string;
  email: string;
  teamId?: string;
}

interface ExtendedToken {
  userId?: string;
  email?: string;
  teamId?: string;
  [key: string]: unknown;
}

interface ExtendedSession {
  userId?: string;
  email?: string;
  teamId?: string;
  [key: string]: unknown;
}

export const authOptions = {
  session: { strategy: 'jwt' },
  providers: [
    Credentials({
      name: 'OTP',
      credentials: {
        email: { label: 'Email', type: 'text' },
        otpVerified: { label: 'OTP Verified', type: 'boolean' },
      },
      authorize: async (credentials): Promise<AuthUser | null> => {
        if (!credentials?.otpVerified || !credentials.email) return null;
        await dbConnect();
        const user = await User.findOne({ email: credentials.email });
        if (!user) return null;
        return {
          id: user._id.toString(),
          email: user.email,
          teamId: user.teamId?.toString(),
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: { token: ExtendedToken; user?: AuthUser }) {
      if (user) {
        token.userId = user.id;
        token.email = user.email;
        token.teamId = user.teamId;
      }
      return token;
    },
    async session({ session, token }: { session: ExtendedSession; token: ExtendedToken }) {
      session.userId = token.userId;
      session.email = token.email;
      session.teamId = token.teamId;
      return session;
    },
  },
};

export const { handlers, auth, signIn } = NextAuth(authOptions);
export const { GET, POST } = handlers;
