'use client';

import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';

type FormData = {
  email: string;
  password: string;
};

export default function LoginPage() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormData>();
  const router = useRouter();

  const onSubmit = async (data: FormData) => {
    const res = await signIn('credentials', {
      redirect: false,
      email: data.email,
      password: data.password,
    });

    if (res?.error) {
      setError('root', { message: res.error });
      return;
    }

    router.push('/');
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-2 p-4">
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
        {isSubmitting ? 'Loading...' : 'Login'}
      </button>
    </form>
  );
}
