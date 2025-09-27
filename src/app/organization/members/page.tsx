'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import RoleSelector from '@/components/role-selector';

interface User {
  _id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'USER';
  avatarUrl?: string;
  department?: string;
  status?: 'active' | 'inactive' | 'pending';
  permissions?: string[];
  projects?: number;
  tasksAssigned?: number;
  tasksCompleted?: number;
  phone?: string;
  location?: string;
}

type MemberStatus = NonNullable<User['status']>;

function Spinner() {
  return (
    <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-transparent" />
  );
}

interface MemberCardProps {
  user: User;
  onUpdated: (user: User) => void;
}

function MemberCard({ user, onUpdated }: MemberCardProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<{ role: User['role'] }>({
    defaultValues: { role: user.role },
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    reset({ role: user.role });
  }, [reset, user.role]);

  useEffect(() => {
    if (!success) return;
    const timeout = window.setTimeout(() => setSuccess(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [success]);

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
      setSuccess('Role updated');
    } catch (e: unknown) {
      const err = e as Error;
      setError(err.message || 'Failed to update');
    }
  };

  const status = (user.status ?? 'pending') as MemberStatus;

  const statusStyles: Record<MemberStatus, string> = {
    active: 'border-green-200 bg-green-50 text-green-700',
    inactive: 'border-gray-200 bg-gray-100 text-gray-600',
    pending: 'border-amber-200 bg-amber-50 text-amber-700',
  };

  const permissions =
    user.permissions && user.permissions.length > 0
      ? user.permissions
      : user.role === 'ADMIN'
        ? ['Full Access', 'User Management']
        : ['Project Collaboration'];

  const completionRate = user.tasksAssigned
    ? Math.round(((user.tasksCompleted ?? 0) / user.tasksAssigned) * 100)
    : 0;

  const metrics = [
    { label: 'Active Projects', value: user.projects ?? 0 },
    { label: 'Tasks Assigned', value: user.tasksAssigned ?? 0 },
    { label: 'Tasks Completed', value: user.tasksCompleted ?? 0 },
  ];

  const initials = user.name
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');

  return (
    <article className="flex h-full flex-col justify-between rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="space-y-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="h-14 w-14 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-lg font-semibold text-blue-700">
                {initials}
              </div>
            )}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-semibold text-gray-900">{user.name}</h3>
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusStyles[status]}`}
                >
                  {status}
                </span>
              </div>
              <p className="text-sm text-gray-600">
                {user.department ?? 'General Department'} • {completionRate}% completion rate
              </p>
              <div className="flex flex-wrap gap-2">
                {permissions.map((permission) => (
                  <span
                    key={permission}
                    className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700"
                  >
                    {permission}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <form
            onChange={handleSubmit(onSubmit)}
            className="w-full max-w-[200px] sm:w-auto"
          >
            <RoleSelector
              {...register('role')}
              id={`role-${user._id}`}
              label="Role"
              className="text-sm"
            />
            <div className="mt-2 flex items-center gap-2 text-xs">
              {isSubmitting && <Spinner />}
              {success && <span className="text-green-600">{success}</span>}
              {error && <span className="text-red-500">{error}</span>}
            </div>
          </form>
        </div>
        <div className="grid grid-cols-3 gap-4 rounded-xl bg-gray-50 p-4 text-sm">
          {metrics.map((metric) => (
            <div key={metric.label} className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-gray-500">
                {metric.label}
              </p>
              <p className="text-lg font-semibold text-gray-900">
                {metric.value.toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-6 border-t border-gray-200 pt-4 text-sm text-gray-600">
        <div className="flex flex-col gap-2">
          <a className="break-all text-blue-600 hover:underline" href={`mailto:${user.email}`}>
            {user.email}
          </a>
          <span>{user.phone ?? 'Phone not provided'}</span>
          <span>{user.location ?? 'Location not specified'}</span>
        </div>
      </div>
    </article>
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
    void load();
  }, []);

  const handleUpdated = (updated: User) => {
    setMembers((prev) => prev.map((m) => (m._id === updated._id ? updated : m)));
  };

  const stats = useMemo(() => {
    const totalMembers = members.length;
    const activeMembers = members.filter((member) => (member.status ?? 'pending') === 'active').length;
    const admins = members.filter((member) => member.role === 'ADMIN').length;
    const pending = members.filter((member) => (member.status ?? 'pending') === 'pending').length;

    return [
      { label: 'Total Members', value: totalMembers },
      { label: 'Active Members', value: activeMembers },
      { label: 'Administrators', value: admins },
      { label: 'Pending Invitations', value: pending },
    ];
  }, [members]);

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return <div className="p-6 text-red-500">{error}</div>;
  }

  return (
    <div className="space-y-8 p-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-gray-900">Organization Members</h1>
        <p className="text-sm text-gray-600">
          Track member activity, manage permissions, and keep contact information up to date.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </section>

      {members.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
          No members found.
        </div>
      ) : (
        <section className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {members.map((member) => (
            <MemberCard key={member._id} user={member} onUpdated={handleUpdated} />
          ))}
        </section>
      )}
    </div>
  );
}
