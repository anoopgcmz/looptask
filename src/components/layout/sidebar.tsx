'use client';
import Link from 'next/link';

export default function Sidebar() {
  const navItems = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/tasks', label: 'Tasks' },
    { href: '/notifications', label: 'Notifications' },
  ];
  return (
    <aside className="w-64 border-r border-[var(--color-border)] bg-[var(--color-surface)] p-4 flex flex-col">
      <nav className="space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block rounded px-2 py-1 text-[var(--color-text)] hover:bg-[var(--color-primary)]/10 transition"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
