import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

const ADMIN_LOGIN_PATH = '/admin/login';

const PUBLIC_ROUTES = new Set([
  '/',
  '/login',
  '/signin',
  '/register',
  '/forgot-password',
  '/terms',
  '/privacy',
  '/api/register',
  ADMIN_LOGIN_PATH,
]);

const PUBLIC_PREFIXES = ['/api/auth'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdminRoute = pathname.startsWith('/admin');
  const isAdminLoginRoute = pathname === ADMIN_LOGIN_PATH;

  const isAsset =
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/static/') ||
    pathname.startsWith('/favicon.ico');

  const isPublicRoute =
    isAsset ||
    PUBLIC_ROUTES.has(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (isPublicRoute || isAdminLoginRoute) {
    return NextResponse.next();
  }

  const session = await getToken({ req: request });

  if (session) {
    return NextResponse.next();
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = isAdminRoute ? ADMIN_LOGIN_PATH : '/login';
  loginUrl.searchParams.set('callbackUrl', request.nextUrl.pathname + request.nextUrl.search);

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
