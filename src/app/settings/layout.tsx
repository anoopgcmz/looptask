import type { ReactNode } from 'react';
import RequireAuth from '@/components/layout/RequireAuth';

export default async function SettingsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <RequireAuth callbackUrl="/settings">{children}</RequireAuth>;
}
