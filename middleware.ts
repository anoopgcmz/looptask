export { auth as middleware } from './src/lib/auth';

export const config = {
  matcher: ['/((?!api/auth|signin).*)'],
};
