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
    const readHandler = (e: Event) => {
      const detail = (e as CustomEvent<{ count?: number }>).detail;
      setCount((c) => Math.max(0, c - (detail?.count ?? 1)));
    };
    const unreadHandler = (e: Event) => {
      const detail = (e as CustomEvent<{ count?: number }>).detail;
      setCount((c) => c + (detail?.count ?? 1));
    };
    window.addEventListener('notification-read', readHandler);
    window.addEventListener('notification-unread', unreadHandler);
    return () => {
      window.removeEventListener('notification-read', readHandler);
      window.removeEventListener('notification-unread', unreadHandler);
    };
  }, []);

  useNotificationsChannel({
    onNotification: () => setCount((c) => c + 1),
  });

  if (count === 0) return null;

  return <Badge className="ml-2">{count}</Badge>;
}
