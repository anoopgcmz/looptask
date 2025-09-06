'use client';
import { useEffect, useState, useCallback } from 'react';
import useNotificationsChannel, { type NotificationPayload } from '@/hooks/useNotificationsChannel';

const PAGE_SIZE = 20;

export default function NotificationsPage() {
  const [filters, setFilters] = useState({
    type: '',
    read: '',
    startDate: '',
    endDate: '',
  });
  const [items, setItems] = useState<NotificationPayload[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(
    async (nextPage: number, replace = false) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (filters.type) params.append('type', filters.type);
        if (filters.read) params.append('read', filters.read);
        if (filters.startDate) params.append('startDate', filters.startDate);
        if (filters.endDate) params.append('endDate', filters.endDate);
        params.append('limit', PAGE_SIZE.toString());
        params.append('page', nextPage.toString());
        const res = await fetch(`/api/notifications?${params.toString()}`);
        if (res.ok) {
          const data = (await res.json()) as NotificationPayload[];
          setItems((prev) => (replace ? data : [...prev, ...data]));
          setHasMore(data.length === PAGE_SIZE);
          setPage(nextPage);
        }
      } finally {
        setLoading(false);
      }
    },
    [filters]
  );

  useEffect(() => {
    void load(1, true);
  }, [filters, load]);

  const loadMore = () => {
    void load(page + 1);
  };

  useNotificationsChannel({
    onNotification: (n) => {
      const matchesType = !filters.type || filters.type === n.type;
      const matchesRead =
        !filters.read || (filters.read === 'true' ? n.read : !n.read);
      const created = new Date(n.createdAt);
      const matchesStart =
        !filters.startDate || created >= new Date(filters.startDate);
      const matchesEnd =
        !filters.endDate || created <= new Date(filters.endDate);
      if (matchesType && matchesRead && matchesStart && matchesEnd) {
        setItems((items) => [n, ...items]);
      }
    },
  });

  const updateReadState = async (id: string, read: boolean) => {
    const res = await fetch(`/api/notifications/${id}/read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ read }),
    });
    if (res.ok) {
      if ((read && filters.read === 'false') || (!read && filters.read === 'true')) {
        setItems((items) => items.filter((n) => n._id !== id));
      } else {
        setItems((items) =>
          items.map((n) =>
            n._id === id
              ? { ...n, read, readAt: read ? new Date().toISOString() : null }
              : n
          )
        );
      }
      window.dispatchEvent(new CustomEvent(read ? 'notification-read' : 'notification-unread'));
    }
  };

  const markAllRead = async () => {
    const unread = items.filter((n) => !n.read);
    await Promise.all(
      unread.map((n) =>
        fetch(`/api/notifications/${n._id}/read`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ read: true }),
        })
      )
    );
    if (unread.length > 0) {
      if (filters.read === 'false') {
        setItems([]);
        setHasMore(false);
      } else {
        setItems((items) =>
          items.map((n) =>
            n.read ? n : { ...n, read: true, readAt: new Date().toISOString() }
          )
        );
      }
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

      <div className="flex flex-wrap gap-2 mb-4">
        <input
          type="text"
          placeholder="Type"
          value={filters.type}
          onChange={(e) => setFilters({ ...filters, type: e.target.value })}
          className="border p-1 text-sm"
        />
        <select
          value={filters.read}
          onChange={(e) => setFilters({ ...filters, read: e.target.value })}
          className="border p-1 text-sm"
        >
          <option value="">All</option>
          <option value="false">Unread</option>
          <option value="true">Read</option>
        </select>
        <input
          type="date"
          value={filters.startDate}
          onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
          className="border p-1 text-sm"
        />
        <input
          type="date"
          value={filters.endDate}
          onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
          className="border p-1 text-sm"
        />
      </div>

      <ul className="flex flex-col gap-1">
        {items.map((n) => (
          <li
            key={n._id}
            onClick={() => !n.read && updateReadState(n._id, true)}
            className={`cursor-pointer p-2 rounded ${n.read ? 'text-gray-500' : 'font-bold'}`}
          >
            {n.message}
            {n.read && (
              <button
                className="ml-2 text-xs underline"
                onClick={(e) => {
                  e.stopPropagation();
                  void updateReadState(n._id, false);
                }}
              >
                Mark as unread
              </button>
            )}
          </li>
        ))}
      </ul>

      {hasMore && (
        <button
          onClick={loadMore}
          className="mt-4 border px-4 py-2 text-sm"
          disabled={loading}
        >
          Load more
        </button>
      )}
    </div>
  );
}

