import type { ReactNode } from 'react';
import RequireAuth from '@/components/layout/RequireAuth';

export default async function TasksLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <RequireAuth>{children}</RequireAuth>;
}
