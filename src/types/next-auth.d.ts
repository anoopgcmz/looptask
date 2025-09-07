import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    userId: string;
    email: string;
    organizationId: string | undefined;
    teamId: string | undefined;
    role: string | undefined;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId: string;
    email: string;
    organizationId: string | undefined;
    teamId: string | undefined;
    role: string | undefined;
  }
}
