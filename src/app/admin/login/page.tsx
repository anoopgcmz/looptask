import { redirect } from 'next/navigation';
import LoginForm from '@/components/auth/LoginForm';
import { auth } from '@/lib/auth';

const ADMIN_HOME_PATH = '/admin/users';

export default async function AdminLoginPage() {
  const session = await auth();

  if (session?.role === 'ADMIN') {
    redirect(ADMIN_HOME_PATH);
  }

  if (session) {
    redirect('/dashboard');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
      <div className="w-full max-w-md space-y-6 rounded-lg bg-white/95 p-8 text-center shadow-xl">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-500">
            Product Ops Portal
          </p>
          <h1 className="text-2xl font-semibold text-slate-900">Admin Console Sign in</h1>
          <p className="text-sm text-slate-600">
            Enter your product team credentials to manage organizations, teams, and workspace settings.
          </p>
        </div>
        <LoginForm callbackUrl={ADMIN_HOME_PATH} />
      </div>
    </div>
  );
}
