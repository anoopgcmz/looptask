'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';

interface Organization {
  _id: string;
  name: string;
}

interface FormData {
  name: string;
  email: string;
  password: string;
  organizationId?: string;
  organizationName?: string;
}

export default function RegisterPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [orgLoading, setOrgLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [newOrg, setNewOrg] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormData>();

  useEffect(() => {
    const loadOrganizations = async () => {
      setOrgLoading(true);
      try {
        const res = await fetch('/api/organizations');
        if (!res.ok) throw new Error('Failed to load');
        const data = await res.json();
        setOrganizations(data);
      } catch {
        setFetchError('Failed to load organizations');
      } finally {
        setOrgLoading(false);
      }
    };
    void loadOrganizations();
  }, []);

  const onSubmit = async (data: FormData) => {
    const payload: FormData = {
      name: data.name,
      email: data.email,
      password: data.password,
    };
    if (newOrg) {
      payload.organizationName = data.organizationName;
    } else {
      payload.organizationId = data.organizationId;
    }
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        setError('root', { message: err.detail || 'Registration failed' });
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
        type="email"
        placeholder="Email"
        className="border p-2"
        {...register('email', { required: 'Email is required' })}
      />
      {errors.email && <p className="text-red-500">{errors.email.message}</p>}

      <input
        type="password"
        placeholder="Password"
        className="border p-2"
        {...register('password', { required: 'Password is required' })}
      />
      {errors.password && <p className="text-red-500">{errors.password.message}</p>}

      {orgLoading ? (
        <p>Loading organizations...</p>
      ) : (
        <>
          {fetchError && <p className="text-red-500">{fetchError}</p>}
          {!newOrg && (
            <>
              <select
                className="border p-2"
                {...register('organizationId', { required: 'Organization is required' })}
              >
                <option value="">Select organization</option>
                {organizations.map((org) => (
                  <option key={org._id} value={org._id}>
                    {org.name}
                  </option>
                ))}
              </select>
              {errors.organizationId && (
                <p className="text-red-500">{errors.organizationId.message}</p>
              )}
              <button
                type="button"
                className="text-blue-500 underline"
                onClick={() => setNewOrg(true)}
              >
                Create new organization
              </button>
            </>
          )}
          {newOrg && (
            <>
              <input
                type="text"
                placeholder="Organization Name"
                className="border p-2"
                {...register('organizationName', { required: 'Organization name is required' })}
              />
              {errors.organizationName && (
                <p className="text-red-500">{errors.organizationName.message}</p>
              )}
              <button
                type="button"
                className="text-blue-500 underline"
                onClick={() => setNewOrg(false)}
              >
                Select existing organization
              </button>
            </>
          )}
        </>
      )}

      {errors.root && <p className="text-red-500">{errors.root.message}</p>}

      <button
        type="submit"
        className="bg-blue-500 text-white p-2"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Submitting...' : 'Register'}
      </button>
    </form>
  );
}
