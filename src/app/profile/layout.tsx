import type { ReactNode } from 'react';
import RequireAuth from '@/components/layout/RequireAuth';

export default async function ProfileLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <RequireAuth callbackUrl="/profile">{children}</RequireAuth>;
}
