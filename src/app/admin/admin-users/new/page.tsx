'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewAdminPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
    organizationId: '',
    teamId: '',
  });
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, role: 'ADMIN' }),
    });
    router.push('/admin/users');
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 p-4">
      <input name="name" value={form.name} onChange={handleChange} placeholder="Name" className="border p-2" required />
      <input name="email" value={form.email} onChange={handleChange} placeholder="Email" className="border p-2" required />
      <input name="username" value={form.username} onChange={handleChange} placeholder="Username" className="border p-2" required />
      <input name="password" type="password" value={form.password} onChange={handleChange} placeholder="Password" className="border p-2" required />
      <input name="organizationId" value={form.organizationId} onChange={handleChange} placeholder="Organization ID" className="border p-2" required />
      <input name="teamId" value={form.teamId} onChange={handleChange} placeholder="Team ID" className="border p-2" />
      <button type="submit" className="bg-blue-500 text-white p-2">Save Admin</button>
    </form>
  );
}
