'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function EditUserPage() {
  const params = useParams();
  const id = params?.id as string;
  const [form, setForm] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
    organizationId: '',
    teamId: '',
    isAdmin: false,
  });
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      const res = await fetch('/api/users/' + id);
      const data = await res.json();
      setForm({
        name: data.name || '',
        email: data.email || '',
        username: data.username || '',
        password: '',
        organizationId: data.organizationId || '',
        teamId: data.teamId || '',
        isAdmin: data.isAdmin || false,
      });
    };
    if (id) void load();
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, type, checked, value } = e.target;
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form };
    if (!payload.password) delete (payload as any).password;
    await fetch('/api/users/' + id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    router.push('/admin/users');
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 p-4">
      <input name="name" value={form.name} onChange={handleChange} placeholder="Name" className="border p-2" required />
      <input name="email" value={form.email} onChange={handleChange} placeholder="Email" className="border p-2" required />
      <input name="username" value={form.username} onChange={handleChange} placeholder="Username" className="border p-2" required />
      <input name="password" type="password" value={form.password} onChange={handleChange} placeholder="Password" className="border p-2" />
      <input name="organizationId" value={form.organizationId} onChange={handleChange} placeholder="Organization ID" className="border p-2" required />
      <input name="teamId" value={form.teamId} onChange={handleChange} placeholder="Team ID" className="border p-2" />
      <label className="flex items-center gap-2">
        <input type="checkbox" name="isAdmin" checked={form.isAdmin} onChange={handleChange} /> Admin
      </label>
      <button type="submit" className="bg-blue-500 text-white p-2">Save</button>
    </form>
  );
}
