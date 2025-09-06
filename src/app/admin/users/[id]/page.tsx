'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import RoleSelector from '@/components/role-selector';

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
    role: 'USER',
  });
  const [status, setStatus] = useState<{ success?: string; error?: string }>({});

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
        role: data.role || 'USER',
      });
    };
    if (id) void load();
  }, [id]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form };
    if (!payload.password) delete (payload as unknown).password;
    setStatus({});
    try {
      const res = await fetch('/api/users/' + id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail || 'Failed to save');
      }
      setStatus({ success: 'Saved' });
    } catch (e: unknown) {
      const err = e as Error;
      setStatus({ error: err.message || 'Failed to save' });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 p-4">
      <input name="name" value={form.name} onChange={handleChange} placeholder="Name" className="border p-2" required />
      <input name="email" value={form.email} onChange={handleChange} placeholder="Email" className="border p-2" required />
      <input name="username" value={form.username} onChange={handleChange} placeholder="Username" className="border p-2" required />
      <input name="password" type="password" value={form.password} onChange={handleChange} placeholder="Password" className="border p-2" />
      <input name="organizationId" value={form.organizationId} onChange={handleChange} placeholder="Organization ID" className="border p-2" required />
      <input name="teamId" value={form.teamId} onChange={handleChange} placeholder="Team ID" className="border p-2" />
      <RoleSelector
        name="role"
        value={form.role}
        onChange={handleChange}
        className="border p-2"
      />
      {status.success && <p className="text-green-600">{status.success}</p>}
      {status.error && <p className="text-red-500">{status.error}</p>}
      <button type="submit" className="bg-blue-500 text-white p-2">Save</button>
    </form>
  );
}
