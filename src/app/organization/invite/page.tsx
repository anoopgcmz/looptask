'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';

interface FormData {
  email: string;
  role: 'ADMIN' | 'USER';
}

export default function InvitePage() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    clearErrors,
    reset,
  } = useForm<FormData>({ defaultValues: { role: 'USER' } });
  const [success, setSuccess] = useState<string | null>(null);

  const onSubmit = async (data: FormData) => {
    setSuccess(null);
    clearErrors();
    try {
      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail || 'Failed to send');
      }
      setSuccess('Invitation sent');
      reset({ email: '', role: data.role });
    } catch (e: any) {
      setError('root', { message: e.message || 'Failed to send' });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-2 p-4">
      <input
        type="email"
        placeholder="Email"
        className="border p-2"
        {...register('email', { required: 'Email is required' })}
      />
      {errors.email && <p className="text-red-500">{errors.email.message}</p>}
      <select className="border p-2" {...register('role')}>
        <option value="USER">User</option>
        <option value="ADMIN">Admin</option>
      </select>
      {errors.root && <p className="text-red-500">{errors.root.message}</p>}
      {success && <p className="text-green-600">{success}</p>}
      <button
        type="submit"
        className="bg-blue-500 text-white p-2"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Sending...' : 'Send Invite'}
      </button>
    </form>
  );
}
