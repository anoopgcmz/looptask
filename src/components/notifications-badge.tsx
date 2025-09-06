'use client';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import useNotificationsChannel from '@/hooks/useNotificationsChannel';

export default function NotificationsBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    fetch('/api/notifications/unread-count')
      .then((res) => (res.ok ? res.json() : { count: 0 }))
      .then((data) => setCount(data.count))
      .catch(() => {});
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ count?: number }>).detail;
      setCount((c) => Math.max(0, c - (detail?.count ?? 1)));
    };
    window.addEventListener('notification-read', handler);
    return () => window.removeEventListener('notification-read', handler);
  }, []);

  useNotificationsChannel({
    onNotification: () => setCount((c) => c + 1),
  });

  if (count === 0) return null;

  return <Badge className="ml-2">{count}</Badge>;
}
