'use client';
import { useEffect, useState } from 'react';
import useNotificationsChannel from '@/hooks/useNotificationsChannel';

export default function NotificationsPage() {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        setItems(await res.json());
      }
    };
    load();
  }, []);

  useNotificationsChannel({
    onNotification: (n) => setItems((items) => [n, ...items]),
  });

  const markRead = async (id: string) => {
    const res = await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
    if (res.ok) {
      setItems((items) =>
        items.map((n) => (n._id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n))
      );
      window.dispatchEvent(new CustomEvent('notification-read'));
    }
  };

  const markAllRead = async () => {
    const unread = items.filter((n) => !n.read);
    await Promise.all(
      unread.map((n) => fetch(`/api/notifications/${n._id}/read`, { method: 'POST' }))
    );
    if (unread.length > 0) {
      setItems((items) =>
        items.map((n) => (n.read ? n : { ...n, read: true, readAt: new Date().toISOString() }))
      );
      window.dispatchEvent(
        new CustomEvent('notification-read', { detail: { count: unread.length } })
      );
    }
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-xl">Notifications</h1>
        {items.some((n) => !n.read) && (
          <button onClick={markAllRead} className="text-sm underline">
            Mark all read
          </button>
        )}
      </div>
      <ul className="flex flex-col gap-1">
        {items.map((n) => (
          <li
            key={n._id}
            onClick={() => !n.read && markRead(n._id)}
            className={`cursor-pointer p-2 rounded ${n.read ? 'text-gray-500' : 'font-bold'}`}
          >
            {n.message}
          </li>
        ))}
      </ul>
    </div>
  );
}

