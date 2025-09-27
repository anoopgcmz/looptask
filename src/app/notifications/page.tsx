'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import useNotificationsChannel, { type NotificationPayload } from '@/hooks/useNotificationsChannel';

const PAGE_SIZE = 20;
const PRIORITY_OPTIONS = ['LOW', 'MEDIUM', 'HIGH'] as const;
const TABS = ['Live Feed', 'History', 'Settings'] as const;

const normalizeType = (type: string) => type.trim().toLowerCase();

const typeStyles: Record<
  string,
  {
    badgeClass: string;
    icon: string;
    label: string;
  }
> = {
  alert: {
    badgeClass: 'border-rose-200 bg-rose-100 text-rose-600',
    icon: '!',
    label: 'Alert',
  },
  reminder: {
    badgeClass: 'border-amber-200 bg-amber-100 text-amber-600',
    icon: '⏰',
    label: 'Reminder',
  },
  task: {
    badgeClass: 'border-emerald-200 bg-emerald-100 text-emerald-600',
    icon: '🗒️',
    label: 'Task Update',
  },
  default: {
    badgeClass: 'border-slate-200 bg-slate-100 text-slate-600',
    icon: '🔔',
    label: 'Notification',
  },
};

const getTypePresentation = (type: string | undefined) => {
  if (!type) return typeStyles.default;
  const normalized = normalizeType(type);
  const preset = typeStyles[normalized];
  if (preset) return preset;
  return {
    ...typeStyles.default,
    label: type
      .replace(/[-_]/g, ' ')
      .replace(/(^|\s)\S/g, (s) => s.toUpperCase()),
  };
};

const formatDateTime = (value: string) => {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
};

export default function NotificationsPage() {
  const [filters, setFilters] = useState({
    type: '',
    priority: '',
    search: '',
    read: '',
    startDate: '',
    endDate: '',
  });
  const [items, setItems] = useState<NotificationPayload[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>('Live Feed');

  const load = useCallback(
    async (nextPage: number, replace = false) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (filters.type) params.append('type', filters.type);
        if (filters.priority) params.append('priority', filters.priority);
        if (filters.search) params.append('search', filters.search);
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
      const matchesPriority =
        !filters.priority || filters.priority === (n.priority ?? '').toUpperCase();
      const matchesSearch =
        !filters.search ||
        n.message.toLowerCase().includes(filters.search.toLowerCase());
      const matchesRead =
        !filters.read || (filters.read === 'true' ? n.read : !n.read);
      const created = new Date(n.createdAt);
      const matchesStart =
        !filters.startDate || created >= new Date(filters.startDate);
      const matchesEnd =
        !filters.endDate || created <= new Date(filters.endDate);
      if (
        matchesType &&
        matchesPriority &&
        matchesSearch &&
        matchesRead &&
        matchesStart &&
        matchesEnd
      ) {
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

  const typeOptions = useMemo(() => {
    const values = new Set<string>();
    items.forEach((item) => {
      if (item.type) values.add(item.type);
    });
    return Array.from(values).sort();
  }, [items]);

  const hasUnread = items.some((n) => !n.read);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Notifications</h1>
            <p className="text-sm text-slate-500">
              Stay on top of the latest alerts, reminders, and updates.
            </p>
          </div>
          {hasUnread && (
            <button
              onClick={markAllRead}
              className="inline-flex items-center justify-center rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100"
            >
              Mark all as read
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-full border border-slate-200 bg-white p-1 text-sm font-medium text-slate-500">
          {TABS.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`rounded-full px-4 py-1 transition ${
                  isActive
                    ? 'bg-slate-900 text-white shadow'
                    : 'hover:text-slate-900'
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>

        <div className="grid gap-3 md:grid-cols-6">
          <div className="relative md:col-span-2">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
              <svg
                aria-hidden="true"
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Search notifications"
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-3 text-sm text-slate-700 shadow-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
          </div>
          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          >
            <option value="">All types</option>
            {typeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <select
            value={filters.priority}
            onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          >
            <option value="">All priorities</option>
            {PRIORITY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <select
            value={filters.read}
            onChange={(e) => setFilters({ ...filters, read: e.target.value })}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          >
            <option value="">Read state</option>
            <option value="false">Unread</option>
            <option value="true">Read</option>
          </select>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          />
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          />
        </div>
      </div>

      {activeTab === 'Live Feed' ? (
        <>
          <ul className="flex flex-col gap-4">
            {items.map((n) => {
              const presentation = getTypePresentation(n.type);
              const isUnread = !n.read;
              return (
                <li
                  key={n._id}
                  className={`flex gap-4 rounded-2xl border p-4 shadow-sm transition hover:border-slate-300 hover:shadow ${
                    isUnread ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-white'
                  }`}
                >
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border text-lg font-semibold ${presentation.badgeClass}`}
                    aria-hidden="true"
                  >
                    {presentation.icon}
                  </div>
                  <div className="flex flex-1 flex-col gap-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-slate-900">
                          {presentation.label}
                        </span>
                        <span className="text-xs text-slate-500">
                          {formatDateTime(n.createdAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            isUnread
                              ? 'bg-blue-200/70 text-blue-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {isUnread ? 'Unread' : 'Read'}
                        </span>
                        {n.priority && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium uppercase text-slate-600">
                            {n.priority}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-slate-700">{n.message}</p>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-xs text-slate-400">
                        {n.readAt ? `Read ${formatDateTime(n.readAt)}` : 'Not yet viewed'}
                      </div>
                      <div className="flex items-center gap-2">
                        {n.read ? (
                          <button
                            type="button"
                            onClick={() => void updateReadState(n._id, false)}
                            className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                          >
                            Mark as unread
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void updateReadState(n._id, true)}
                            className="inline-flex items-center rounded-full border border-blue-300 bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 transition hover:bg-blue-200"
                          >
                            Mark as read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {items.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
              No notifications to show right now. Try adjusting your filters or check back
              later.
            </div>
          )}

          {hasMore && (
            <div className="flex justify-center">
              <button
                onClick={loadMore}
                className="mt-4 inline-flex items-center rounded-full border border-slate-200 bg-white px-6 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                disabled={loading}
              >
                {loading ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          {activeTab === 'History'
            ? 'Historical notification archives will appear here.'
            : 'Manage your notification preferences in Settings.'}
        </div>
      )}
    </div>
  );
}

