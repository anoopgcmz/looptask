'use client';

import { useForm } from 'react-hook-form';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export type LoginFormData = {
  email: string;
  password: string;
};

export type LoginFormProps = {
  callbackUrl?: string;
};

const DEFAULT_CALLBACK_URL = '/dashboard';

export default function LoginForm({ callbackUrl }: LoginFormProps = {}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<LoginFormData>();
  const router = useRouter();

  const onSubmit = async (data: LoginFormData) => {
    const targetCallback = callbackUrl ?? DEFAULT_CALLBACK_URL;

    const res = await signIn('credentials', {
      redirect: false,
      email: data.email,
      password: data.password,
      callbackUrl: targetCallback,
    });

    if (res?.error) {
      setError('root', { message: res.error });
      return;
    }

    const destination = (() => {
      if (res?.url) {
        try {
          const parsed = new URL(res.url, window.location.origin);
          return `${parsed.pathname}${parsed.search}${parsed.hash}`;
        } catch {
          return res.url;
        }
      }
      return targetCallback;
    })();

    router.push(destination);
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex w-full max-w-sm flex-col gap-3 rounded-md border border-gray-200 bg-white p-6 shadow-sm"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          id="email"
          type="email"
          placeholder="you@example.com"
          className="rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          {...register('email', {
            required: 'Email is required',
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: 'Invalid email address',
            },
          })}
        />
        {errors.email && (
          <p className="text-xs text-red-500">{errors.email.message}</p>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium text-gray-700">
          Password
        </label>
        <input
          id="password"
          type="password"
          placeholder="********"
          className="rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          {...register('password', { required: 'Password is required' })}
        />
        {errors.password && (
          <p className="text-xs text-red-500">{errors.password.message}</p>
        )}
      </div>
      {errors.root && <p className="text-xs text-red-500">{errors.root.message}</p>}
      <button
        type="submit"
        className="mt-2 rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
