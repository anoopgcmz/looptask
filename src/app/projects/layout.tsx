import type { ReactNode } from 'react';
import RequireAuth from '@/components/layout/RequireAuth';

export default async function ProjectsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <RequireAuth callbackUrl="/projects">{children}</RequireAuth>;
}
