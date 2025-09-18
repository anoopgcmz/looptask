import { redirect } from 'next/navigation';
import LoginForm from '@/components/auth/LoginForm';
import { auth } from '@/lib/auth';

export default async function Home() {
  const session = await auth();

  if (session) {
    redirect('/dashboard');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md space-y-6 text-center">
        <h1 className="text-3xl font-semibold text-gray-900">Sign in to LoopTask</h1>
        <p className="text-sm text-gray-600">
          Manage your objectives, tasks, and notifications from a single dashboard.
        </p>
        <LoginForm />
      </div>
    </div>
  );
}
