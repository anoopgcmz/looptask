'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';

const domainPattern = /^(?!-)(?:[a-zA-Z0-9-]{1,63}\.)+[a-zA-Z]{2,}$/;

type AdminRegisterFormData = {
  name: string;
  email: string;
  password: string;
  organizationName: string;
  organizationDomain: string;
};

export default function AdminRegisterPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AdminRegisterFormData>();

  const onSubmit = async (data: AdminRegisterFormData) => {
    setServerError('');
    try {
      const res = await fetch('/api/admin/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { detail?: string } | null;
        setServerError(payload?.detail ?? 'Registration failed. Please try again.');
        return;
      }

      router.push('/admin/login');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unexpected error';
      setServerError(message);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
      <div className="w-full max-w-2xl space-y-8 rounded-xl bg-white/95 p-10 shadow-2xl">
        <div className="space-y-2 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-500">Product Ops Portal</p>
          <h1 className="text-3xl font-semibold text-slate-900">Create admin workspace</h1>
          <p className="text-sm text-slate-600">
            Provision a new organization and create the first administrator account for your product team.
          </p>
        </div>

        {serverError && (
          <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{serverError}</div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="flex flex-col gap-1 text-left">
              <span className="text-sm font-medium text-slate-700">Organization name</span>
              <input
                type="text"
                placeholder="Acme Product Ops"
                className="rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                {...register('organizationName', { required: 'Organization name is required' })}
              />
            </label>
            {errors.organizationName && (
              <p className="mt-1 text-xs text-red-600">{errors.organizationName.message}</p>
            )}
          </div>

          <div className="sm:col-span-2">
            <label className="flex flex-col gap-1 text-left">
              <span className="text-sm font-medium text-slate-700">Primary domain</span>
              <input
                type="text"
                placeholder="acme.com"
                className="rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                {...register('organizationDomain', {
                  required: 'Domain is required',
                  pattern: {
                    value: domainPattern,
                    message: 'Enter a valid domain (e.g., acme.com)',
                  },
                })}
              />
            </label>
            {errors.organizationDomain && (
              <p className="mt-1 text-xs text-red-600">{errors.organizationDomain.message}</p>
            )}
          </div>

          <div>
            <label className="flex flex-col gap-1 text-left">
              <span className="text-sm font-medium text-slate-700">Your name</span>
              <input
                type="text"
                placeholder="Alex Morgan"
                className="rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                {...register('name', { required: 'Name is required' })}
              />
            </label>
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
          </div>

          <div>
            <label className="flex flex-col gap-1 text-left">
              <span className="text-sm font-medium text-slate-700">Work email</span>
              <input
                type="email"
                placeholder="alex@acme.com"
                className="rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Enter a valid email address',
                  },
                })}
              />
            </label>
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
          </div>

          <div className="sm:col-span-2">
            <label className="flex flex-col gap-1 text-left">
              <span className="text-sm font-medium text-slate-700">Password</span>
              <input
                type="password"
                placeholder="Create a secure password"
                className="rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                {...register('password', {
                  required: 'Password is required',
                  minLength: {
                    value: 8,
                    message: 'Password must be at least 8 characters',
                  },
                })}
              />
            </label>
            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
          </div>

          <div className="sm:col-span-2 flex flex-col gap-4 pt-2">
            <button
              type="submit"
              className="w-full rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating workspace…' : 'Create admin workspace'}
            </button>
            <p className="text-center text-xs text-slate-500">
              Already have an account?{' '}
              <a href="/admin/login" className="font-medium text-blue-600 hover:underline">
                Sign in
              </a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

