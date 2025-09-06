'use client';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import useNotificationsChannel from '@/hooks/useNotificationsChannel';

export default function NotificationsBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    fetch('/api/notifications')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setCount(data.length))
      .catch(() => {});
  }, []);

  useNotificationsChannel({
    onNotification: () => setCount((c) => c + 1),
  });

  if (count === 0) return null;

  return <Badge className="ml-2">{count}</Badge>;
}
