import type { Session } from 'next-auth';
import { type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { problem } from '@/lib/http';
import { isPlatformRole } from '@/lib/roles';

export function withOrganization(
  handler: (req: NextRequest, session: Session) => Promise<Response>
): (req: NextRequest) => Promise<Response>;
export function withOrganization<C>(
  handler: (req: NextRequest, ctx: C, session: Session) => Promise<Response>
): (req: NextRequest, ctx: C) => Promise<Response>;
export function withOrganization(
  handler: (...args: unknown[]) => Promise<Response>
) {
  return async (req: NextRequest, ctx?: unknown) => {
    const session = await auth();
    if (!session?.userId) {
      return problem(401, 'Unauthorized', 'You must be signed in.');
    }
    if (!isPlatformRole(session.role) && !session.organizationId) {
      return problem(401, 'Unauthorized', 'You must be signed in.');
    }
    if (handler.length < 3) {
      return handler(req, session);
    }
    return handler(req, ctx, session);
  };
}
