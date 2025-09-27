'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface SidebarProps {
  collapsed?: boolean;
}

type User = {
  name: string;
  email: string;
  avatar?: string | null;
};

export default function Sidebar({ collapsed = false }: SidebarProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pathname = usePathname();

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

  const navItems = useMemo(
    () => [
      { href: '/dashboard', label: 'Dashboard', icon: DashboardIcon },
      { href: '/tasks', label: 'My Tasks', icon: TasksIcon },
      { href: '/settings', label: 'Settings', icon: SettingsIcon },
    ],
    []
  );

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((part) => part[0])
        .join('')
        .toUpperCase()
    : user?.email?.[0]?.toUpperCase();

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 flex flex-col border-r border-[var(--color-border)] bg-[var(--surface-page)] px-3 py-6 transition-all duration-300 ease-in-out',
        collapsed ? 'w-20' : 'w-72'
      )}
    >
      <div className="space-y-8">
        <div className={cn('flex items-center gap-3 px-2', collapsed && 'justify-center px-0')}>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-surface)] shadow-sm">
            <span className="text-lg font-semibold text-[var(--brand-primary)]">LT</span>
          </div>
          {!collapsed && (
            <div>
              <p className="text-base font-semibold text-[var(--tone-text-strong)]">LoopTask</p>
              <p className="text-xs text-[var(--color-text-muted)]">Productivity Hub</p>
            </div>
          )}
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname?.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-[var(--tone-text)] transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--tone-text-strong)]',
                  isActive && 'bg-[var(--color-surface)] text-[var(--tone-text-strong)] shadow-sm',
                  collapsed && 'justify-center px-0'
                )}
              >
                <Icon className="h-5 w-5 text-[var(--brand-primary)]" />
                <span
                  className={cn(
                    'whitespace-nowrap transition-all duration-200',
                    collapsed ? 'invisible w-0 opacity-0' : 'visible opacity-100'
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className={cn('mt-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-sm', collapsed && 'px-0 text-center')}>
        {loading && <p className="text-xs text-[var(--color-text-muted)]">Loading user...</p>}
        {error && !loading && (
          <p className="text-xs text-[var(--color-status-destructive)]" role="alert">
            {error}
          </p>
        )}
        {!loading && !error && user && (
          <div className={cn('flex items-center gap-3', collapsed && 'flex-col gap-2 text-center')}>
            <Avatar src={user.avatar ?? undefined} fallback={initials} className="h-10 w-10 text-base" />
            {!collapsed && (
              <div className="flex flex-col">
                <p className="text-sm font-medium text-[var(--tone-text-strong)]">{user.name}</p>
                <p className="text-xs text-[var(--color-text-muted)]">{user.email}</p>
              </div>
            )}
            {collapsed && (
              <p className="text-xs font-medium text-[var(--tone-text-strong)]">{user.name ?? user.email}</p>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

function DashboardIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3 13h8V3H3v10zM13 21h8V11h-8v10zM13 3v6h8V3h-8zM3 21h8v-6H3v6z" />
    </svg>
  );
}

function TasksIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M9 11l2 2 4-4" />
      <rect x="3" y="4" width="18" height="16" rx="2" ry="2" />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9c0 .69.4 1.31 1.01 1.6.3.15.64.22.99.22H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}
