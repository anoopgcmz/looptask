'use client';

import { use } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';

interface FormData {
  name: string;
  password: string;
}

export default function AcceptInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormData>();
  const router = useRouter();

  const onSubmit = async (data: FormData) => {
    try {
      const res = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, ...data }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        setError('root', { message: err?.detail || 'Registration failed' });
        return;
      }
      router.push('/login');
    } catch {
      setError('root', { message: 'Network error' });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-2 p-4">
      <input
        type="text"
        placeholder="Name"
        className="border p-2"
        {...register('name', { required: 'Name is required' })}
      />
      {errors.name && <p className="text-red-500">{errors.name.message}</p>}
      <input
        type="password"
        placeholder="Password"
        className="border p-2"
        {...register('password', { required: 'Password is required' })}
      />
      {errors.password && <p className="text-red-500">{errors.password.message}</p>}
      {errors.root && <p className="text-red-500">{errors.root.message}</p>}
      <button
        type="submit"
        className="bg-blue-500 text-white p-2"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Registering...' : 'Register'}
      </button>
    </form>
  );
}
