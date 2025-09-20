import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

const PUBLIC_ROUTES = new Set([
  '/',
  '/login',
  '/signin',
  '/register',
  '/forgot-password',
  '/terms',
  '/privacy',
  '/api/register',
]);

const PUBLIC_PREFIXES = ['/api/auth'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAsset =
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/static/') ||
    pathname.startsWith('/favicon.ico');

  const isPublicRoute =
    isAsset ||
    PUBLIC_ROUTES.has(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (isPublicRoute) {
    return NextResponse.next();
  }

  const session = await getToken({ req: request });

  if (session) {
    return NextResponse.next();
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = '/login';
  loginUrl.searchParams.set('callbackUrl', request.nextUrl.pathname + request.nextUrl.search);

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
