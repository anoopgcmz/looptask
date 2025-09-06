'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import RoleSelector from '@/components/role-selector';

interface User {
  _id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'USER';
}

function Spinner() {
  return (
    <div className="animate-spin h-5 w-5 border-2 border-gray-300 border-t-transparent rounded-full" />
  );
}

interface MemberRowProps {
  user: User;
  onUpdated: (user: User) => void;
}

function MemberRow({ user, onUpdated }: MemberRowProps) {
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<{ role: User['role'] }>({
    defaultValues: { role: user.role },
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const onSubmit = async (data: { role: User['role'] }) => {
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/users/${user._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: data.role }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail || 'Failed to update');
      }
      const updated = await res.json();
      onUpdated(updated);
      setSuccess('Saved');
    } catch (e: unknown) {
      const err = e as Error;
      setError(err.message || 'Failed to update');
    }
  };

  return (
    <tr className="border-b">
      <td className="p-2">{user.name}</td>
      <td className="p-2">{user.email}</td>
      <td className="p-2">
        <form onChange={handleSubmit(onSubmit)} className="flex items-center gap-2">
          <RoleSelector
            {...register('role')}
            className="border p-1 rounded"
            defaultValue={user.role}
          />
          {isSubmitting && <Spinner />}
        </form>
        {success && <p className="text-green-600 text-sm mt-1">{success}</p>}
        {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
      </td>
    </tr>
  );
}

export default function MembersPage() {
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setError(null);
      try {
        const res = await fetch('/api/users');
        if (!res.ok) {
          const err = await res.json().catch(() => null);
          throw new Error(err?.detail || 'Failed to load');
        }
        const data = await res.json();
        setMembers(data);
      } catch (e: unknown) {
        const err = e as Error;
        setError(err.message || 'Failed to load');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleUpdated = (updated: User) => {
    setMembers((prev) => prev.map((m) => (m._id === updated._id ? updated : m)));
  };

  if (loading) {
    return (
      <div className="flex justify-center p-4">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  return (
    <div className="p-4">
      <table className="min-w-full bg-white">
        <thead>
          <tr className="text-left border-b">
            <th className="p-2">Name</th>
            <th className="p-2">Email</th>
            <th className="p-2">Role</th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <MemberRow key={m._id} user={m} onUpdated={handleUpdated} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

