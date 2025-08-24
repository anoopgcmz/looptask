'use client';
import { useEffect, useState } from 'react';

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
  return (
    <div className="p-4">
      <h1 className="text-xl mb-2">Notifications</h1>
      <ul className="flex flex-col gap-1">
        {items.map((n) => (
          <li key={n._id}>{n.type}</li>
        ))}
      </ul>
    </div>
  );
}

