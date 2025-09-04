'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SessionProvider, useSession } from 'next-auth/react';

function NewUserForm() {
  const { data: session } = useSession();
  const [form, setForm] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
    teamId: '',
  });
  const [error, setError] = useState('');
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
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
      body: JSON.stringify({ ...form, organizationId: session?.organizationId }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.detail || 'Failed to create user');
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
      <button type="submit" className="bg-blue-500 text-white p-2">Save</button>
    </form>
  );
}

export default function NewUserPage() {
  return (
    <SessionProvider>
      <NewUserForm />
    </SessionProvider>
  );
}

