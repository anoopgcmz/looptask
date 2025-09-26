'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SessionProvider } from 'next-auth/react';
import useAuth from '@/hooks/useAuth';
import PlatformRoleSelector from '@/components/platform-role-selector';
import type { UserRole } from '@/lib/roles';

function NewAdminForm() {
  const { user } = useAuth();
  const canAssignPlatform = user?.role === 'PLATFORM';
  const [form, setForm] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
    teamId: '',
    role: 'ADMIN' as UserRole,
  });
  const [error, setError] = useState('');
  const router = useRouter();

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]:
        name === 'role'
          ? ((canAssignPlatform ? value : 'ADMIN') as UserRole)
          : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) {
      setError('Please enter a valid email address');
      return;
    }
    setError('');
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, organizationId: user?.organizationId }),
    });
    if (!res.ok) {
      const data = (await res
        .json()
        .catch(() => ({}))) as { detail?: string };
      setError(data.detail ?? 'Failed to create user');
      return;
    }
    router.push('/admin/users');
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 p-4">
      {error && <p className="text-red-500">{error}</p>}
      <input name="name" value={form.name} onChange={handleChange} placeholder="Name" className="border p-2" required />
      <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="Email" className="border p-2" required />
      <input name="username" value={form.username} onChange={handleChange} placeholder="Username" className="border p-2" required />
      <input name="password" type="password" value={form.password} onChange={handleChange} placeholder="Password" className="border p-2" required />
      <input name="teamId" value={form.teamId} onChange={handleChange} placeholder="Team ID" className="border p-2" />
      <PlatformRoleSelector
        name="role"
        value={form.role}
        onChange={handleChange}
        includePlatform={canAssignPlatform}
        className="border p-2"
      />
      <button type="submit" className="bg-blue-500 text-white p-2">Save Admin</button>
    </form>
  );
}

export default function NewAdminPage() {
  return (
    <SessionProvider>
      <NewAdminForm />
    </SessionProvider>
  );
}

