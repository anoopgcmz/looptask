import type { ReactNode } from 'react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

interface RequireAuthProps {
  children: ReactNode;
  callbackUrl?: string;
}

const resolveCallbackUrl = (explicit?: string): string | undefined => {
  if (explicit) {
    return explicit;
  }

  const headerList = headers();
  const path = headerList.get('x-invoke-path');
  if (path) {
    const query = headerList.get('x-invoke-query');
    if (query) {
      return `${path}?${query}`;
    }
    return path;
  }

  const urlHeader =
    headerList.get('x-url') ??
    headerList.get('x-forwarded-url') ??
    headerList.get('referer') ??
    undefined;

  if (!urlHeader) {
    return undefined;
  }

  try {
    const resolvedUrl =
      urlHeader.startsWith('http://') || urlHeader.startsWith('https://')
        ? new URL(urlHeader)
        : new URL(urlHeader, 'http://localhost');
    return `${resolvedUrl.pathname}${resolvedUrl.search}`;
  } catch {
    return urlHeader.startsWith('/') ? urlHeader : undefined;
  }
};

export default async function RequireAuth({
  children,
  callbackUrl,
}: RequireAuthProps) {
  const session = await auth();

  if (!session) {
    const target = resolveCallbackUrl(callbackUrl);
    const query = target ? `?callbackUrl=${encodeURIComponent(target)}` : '';
    redirect(`/login${query}`);
  }

  return <>{children}</>;
}
