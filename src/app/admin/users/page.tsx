'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [q, setQ] = useState('');

  const load = async (search = '') => {
    const res = await fetch('/api/users?q=' + encodeURIComponent(search));
    const data = await res.json();
    setUsers(data);
  };

  useEffect(() => {
    void load();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    await load(q);
  };

  const handleDelete = async (id: string) => {
    await fetch('/api/users/' + id, { method: 'DELETE' });
    await load(q);
  };

  return (
    <div className="p-4 flex flex-col gap-4">
      <div className="flex gap-2">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search users"
            className="border p-2"
          />
          <button type="submit" className="bg-blue-500 text-white px-2">
            Search
          </button>
        </form>
        <Link href="/admin/users/new" className="ml-auto bg-green-500 text-white px-2 py-1">
          Add User
        </Link>
        <Link href="/admin/admin-users/new" className="bg-green-500 text-white px-2 py-1">
          Add Admin
        </Link>
      </div>
      <table className="border-collapse border w-full">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2">Name</th>
            <th className="border p-2">Email</th>
            <th className="border p-2">Username</th>
            <th className="border p-2">Admin</th>
            <th className="border p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u._id}>
              <td className="border p-2">{u.name}</td>
              <td className="border p-2">{u.email}</td>
              <td className="border p-2">{u.username}</td>
              <td className="border p-2">{u.isAdmin ? 'Yes' : 'No'}</td>
              <td className="border p-2 flex gap-2">
                <Link
                  href={`/admin/users/${u._id}`}
                  className="text-blue-500 underline"
                >
                  Edit
                </Link>
                <button
                  onClick={() => void handleDelete(u._id)}
                  className="text-red-500"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
