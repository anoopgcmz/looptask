'use client';
import { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { timing } from '@/lib/motion';

interface TopbarProps {
  onNewTask?: () => void;
  onToggleSidebar?: () => void;
  isSidebarCollapsed?: boolean;
}

export default function Topbar({ onNewTask, onToggleSidebar, isSidebarCollapsed }: TopbarProps) {
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const prefersReducedMotion = useReducedMotion();
  const MotionButton = motion(Button);
  const pathname = usePathname();

  const breadcrumbs = useMemo(() => {
    if (!pathname || pathname === '/') {
      return [];
    }

    const segments = pathname.split('/').filter(Boolean);

    return segments.map((segment, index) => {
      const href = `/${segments.slice(0, index + 1).join('/')}`;
      const label = segment
        .split('-')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');

      return { href, label };
    });
  }, [pathname]);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!onNewTask) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();
    setRipples((r) => [...r, { id, x, y }]);
    setTimeout(() => setRipples((r) => r.filter((rip) => rip.id !== id)), 600);
    onNewTask();
  };

  const currentPageTitle = breadcrumbs.at(-1)?.label ?? 'Overview';

  return (
    <header className="sticky top-0 z-30 border-b border-[#E5E7EB] bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:backdrop-blur">
      <div className="flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onToggleSidebar}
            disabled={!onToggleSidebar}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white text-[#111827] shadow-sm transition hover:border-[#4F46E5] hover:text-[#4F46E5] disabled:cursor-not-allowed disabled:opacity-60"
            aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <MenuIcon className="h-5 w-5" />
          </button>
          <div className="flex flex-col">
            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[var(--color-muted)]">
              <Link href="/" className="transition hover:text-[var(--color-text)]">
                Home
              </Link>
              {breadcrumbs.map((crumb) => (
                <span key={crumb.href} className="flex items-center gap-2">
                  <span className="text-[var(--color-border)]">/</span>
                  <Link href={crumb.href} className="transition hover:text-[var(--color-text)]">
                    {crumb.label}
                  </Link>
                </span>
              ))}
            </nav>
            <h1 className="text-lg font-semibold text-[var(--color-text)]">{currentPageTitle}</h1>
          </div>
        </div>

        {onNewTask && (
          <MotionButton
            onClick={handleClick}
            whileTap={{ scale: 0.95 }}
            className="relative overflow-hidden"
          >
            New Task
            {ripples.map((r) => (
              <motion.span
                key={r.id}
                className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/30"
                style={{ left: r.x, top: r.y, width: 20, height: 20 }}
                initial={{ opacity: 0.5, scale: 0 }}
                animate={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 8 }}
                transition={timing.settle}
              />
            ))}
          </MotionButton>
        )}
      </div>
    </header>
  );
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      className={className}
    >
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}
