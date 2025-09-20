import type { ReactNode } from 'react';
import RequireAuth from '@/components/layout/RequireAuth';

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <RequireAuth callbackUrl="/dashboard">{children}</RequireAuth>;
}
