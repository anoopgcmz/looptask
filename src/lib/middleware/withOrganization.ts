import type { Session } from 'next-auth';
import { auth } from '@/lib/auth';
import { problem } from '@/lib/http';

export function withOrganization(
  handler: (req: Request, session: Session) => Promise<Response>
): (req: Request) => Promise<Response>;
export function withOrganization<C>(
  handler: (req: Request, ctx: C, session: Session) => Promise<Response>
): (req: Request, ctx: C) => Promise<Response>;
export function withOrganization(handler: any) {
  return async (req: Request, ctx?: any) => {
    const session = await auth();
    if (!session?.userId || !session.organizationId) {
      return problem(401, 'Unauthorized', 'You must be signed in.');
    }
    if (handler.length < 3) {
      return handler(req, session);
    }
    return handler(req, ctx, session);
  };
}
