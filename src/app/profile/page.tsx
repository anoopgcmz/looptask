'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

interface FormData {
  name: string;
  email: string;
  username: string;
  avatar: string;
  timezone: string;
}

export default function ProfilePage() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormData>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const res = await fetch('/api/users/me');
        if (!res.ok) throw new Error('Failed to load');
        const data = await res.json();
        reset({
          name: data.name || '',
          email: data.email || '',
          username: data.username || '',
          avatar: data.avatar || '',
          timezone: data.timezone || '',
        });
      } catch {
        setError('Failed to load user');
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, [reset]);

  const onSubmit = async (data: FormData) => {
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/users/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail || 'Failed to update');
      }
      setSuccess('Profile updated successfully');
    } catch (e: any) {
      setError(e.message || 'Failed to update');
    }
  };

  if (loading) {
    return <p className="p-4">Loading...</p>;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-2 p-4 max-w-md">
      <input
        type="text"
        placeholder="Name"
        className="border p-2"
        {...register('name', { required: 'Name is required' })}
      />
      {errors.name && <p className="text-red-500">{errors.name.message}</p>}

      <input
        type="email"
        placeholder="Email"
        className="border p-2"
        {...register('email', {
          required: 'Email is required',
          pattern: {
            value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            message: 'Invalid email address',
          },
        })}
      />
      {errors.email && <p className="text-red-500">{errors.email.message}</p>}

      <input
        type="text"
        placeholder="Username"
        className="border p-2"
        {...register('username', { required: 'Username is required' })}
      />
      {errors.username && <p className="text-red-500">{errors.username.message}</p>}

      <input
        type="url"
        placeholder="Avatar URL"
        className="border p-2"
        {...register('avatar', {
          required: 'Avatar URL is required',
          pattern: {
            value: /^https?:\/\/.*$/,
            message: 'Invalid URL',
          },
        })}
      />
      {errors.avatar && <p className="text-red-500">{errors.avatar.message}</p>}

      <input
        type="text"
        placeholder="Timezone"
        className="border p-2"
        {...register('timezone', { required: 'Timezone is required' })}
      />
      {errors.timezone && <p className="text-red-500">{errors.timezone.message}</p>}

      {error && <p className="text-red-500">{error}</p>}
      {success && <p className="text-green-500">{success}</p>}

      <button
        type="submit"
        className="bg-blue-500 text-white p-2"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Saving...' : 'Save'}
      </button>
    </form>
  );
}
