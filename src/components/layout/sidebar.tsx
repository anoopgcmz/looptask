'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Avatar } from '@/components/ui/avatar';

type User = {
  name: string;
  email: string;
  avatar?: string | null;
};

export default function Sidebar() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchUser() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch('/api/users/me');
        if (!response.ok) {
          throw new Error('Failed to fetch user');
        }
        const data = (await response.json()) as User;
        if (isMounted) {
          setUser(data);
        }
      } catch (fetchError: unknown) {
        if (isMounted) {
          const message =
            fetchError instanceof Error && fetchError.message
              ? fetchError.message
              : 'Unable to load user';
          setError(message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void fetchUser();

    return () => {
      isMounted = false;
    };
  }, []);

  const navItems = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/tasks', label: 'My Tasks' },
    { href: '/settings', label: 'Settings' },
  ];

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((part) => part[0])
        .join('')
        .toUpperCase()
    : user?.email?.[0]?.toUpperCase();

  return (
    <aside className="w-64 border-r border-[var(--color-border)] bg-[var(--color-surface)] p-4 flex flex-col">
      <div className="mb-6">
        {loading && <p className="text-sm text-[var(--color-muted)]">Loading user...</p>}
        {error && !loading && (
          <p className="text-sm text-red-500" role="alert">
            {error}
          </p>
        )}
        {!loading && !error && user && (
          <div className="flex items-center gap-3">
            <Avatar src={user.avatar ?? undefined} fallback={initials} className="h-10 w-10 text-base" />
            <div>
              <p className="text-sm font-medium text-[var(--color-text)]">{user.name}</p>
              <p className="text-xs text-[var(--color-muted)]">{user.email}</p>
            </div>
          </div>
        )}
      </div>
      <nav className="space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center justify-between rounded px-2 py-1 text-[var(--color-text)] hover:bg-[var(--color-primary)]/10 transition"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
