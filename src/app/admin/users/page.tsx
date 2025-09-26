'use client';

import {
  useState,
  useEffect,
  useCallback,
  type FormEvent,
  type ChangeEvent,
} from 'react';
import Link from 'next/link';
import type { UserRole } from '@/lib/roles';

interface User {
  _id: string;
  name: string;
  email: string;
  username: string;
  role: UserRole;
}

const ROLE_LABELS: Record<UserRole, string> = {
  USER: 'Member',
  ADMIN: 'Tenant Admin',
  PLATFORM: 'Platform Admin',
};

interface Organization {
  _id: string;
  name: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [q, setQ] = useState('');
  const [appliedQ, setAppliedQ] = useState('');
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState('');

  const load = useCallback(
    async (search = '', organizationId = '') => {
      const params = new URLSearchParams();
      if (search) {
        params.set('q', search);
      }
      if (organizationId) {
        params.set('organizationId', organizationId);
      }
      const query = params.toString();
      const res = await fetch(`/api/users${query ? `?${query}` : ''}`);
      const data = (await res.json()) as User[];
      setUsers(data);
    },
    []
  );

  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        const res = await fetch('/api/organizations');
        if (!res.ok) {
          throw new Error('Failed to load organizations');
        }
        const data = (await res.json()) as Organization[];
        setOrganizations(data);
      } catch {
        setOrganizations([]);
      }
    };
    void fetchOrganizations();
  }, []);

  useEffect(() => {
    void load(appliedQ, selectedOrganizationId);
  }, [load, appliedQ, selectedOrganizationId]);

  const handleSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAppliedQ(q);
  };

  const handleDelete = async (id: string) => {
    await fetch('/api/users/' + id, { method: 'DELETE' });
    await load(appliedQ, selectedOrganizationId);
  };

  const handleOrganizationChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const newOrganizationId = event.target.value;
    setSelectedOrganizationId(newOrganizationId);
  };

  return (
    <div className="p-4 flex flex-col gap-4">
      <div className="flex gap-2 flex-wrap">
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
        <label className="flex items-center gap-2">
          <span>Organization</span>
          <select
            className="border p-2"
            value={selectedOrganizationId}
            onChange={handleOrganizationChange}
          >
            <option value="">All organizations</option>
            {organizations.map((organization) => (
              <option key={organization._id} value={organization._id}>
                {organization.name}
              </option>
            ))}
          </select>
        </label>
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
            <th className="border p-2">Role</th>
            <th className="border p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u._id}>
              <td className="border p-2">{u.name}</td>
              <td className="border p-2">{u.email}</td>
              <td className="border p-2">{u.username}</td>
              <td className="border p-2">{ROLE_LABELS[u.role] ?? u.role}</td>
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
