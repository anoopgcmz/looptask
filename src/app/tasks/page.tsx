'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SessionProvider } from 'next-auth/react';
import type { TaskResponse as Task } from '@/types/api/task';
import TaskKanbanColumn from '@/components/task-kanban-column';
import useAuth from '@/hooks/useAuth';

const statusTabs = [
  { value: 'OPEN', label: 'Open', query: ['OPEN'] },
  {
    value: 'IN_PROGRESS',
    label: 'In Progress',
    query: ['IN_PROGRESS', 'IN_REVIEW', 'REVISIONS', 'FLOW_IN_PROGRESS'],
  },
  { value: 'DONE', label: 'Done', query: ['DONE'] },
];

const PAGE_SIZE = 20;

function TasksPageInner() {
  const router = useRouter();
  const { user, status, isLoading } = useAuth();
  const [filters, setFilters] = useState({
    assignee: '',
    priority: '',
    dueFrom: '',
    dueTo: '',
    sort: '',
  });
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'board' | 'list' | 'calendar'>('board');
  const [tasks, setTasks] = useState<Record<string, Task[]>>({
    OPEN: [],
    IN_PROGRESS: [],
    DONE: [],
  });
  const [pages, setPages] = useState<Record<string, number>>({
    OPEN: 1,
    IN_PROGRESS: 1,
    DONE: 1,
  });
  const [hasMore, setHasMore] = useState<Record<string, boolean>>({
    OPEN: true,
    IN_PROGRESS: true,
    DONE: true,
  });
  const [loading, setLoading] = useState(false);

  const viewTabs: { value: 'board' | 'list' | 'calendar'; label: string }[] = [
    { value: 'board', label: 'Board' },
    { value: 'list', label: 'List' },
    { value: 'calendar', label: 'Calendar' },
  ];

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.all(
        statusTabs.map(async (s) => {
          const params = new URLSearchParams();
          if (filters.assignee) params.append('ownerId', filters.assignee);
          if (filters.priority) params.append('priority', filters.priority);
          if (filters.dueFrom) params.append('dueFrom', filters.dueFrom);
          if (filters.dueTo) params.append('dueTo', filters.dueTo);
          if (filters.sort) params.append('sort', filters.sort);
          if (search) params.append('q', search);
          s.query.forEach((st) => params.append('status', st));
          params.append('limit', PAGE_SIZE.toString());
          params.append('page', '1');
          try {
            const res = await fetch(`/api/tasks?${params.toString()}`);
            if (!res.ok) return [] as Task[];
            return (await res.json()) as Task[];
          } catch {
            return [] as Task[];
          }
        })
      );
      const nextTasks: Record<string, Task[]> = {};
      const nextPages: Record<string, number> = {};
      const nextHasMore: Record<string, boolean> = {};
      statusTabs.forEach((s, i) => {
        const result = results[i] as Task[];
        nextTasks[s.value] = result;
        nextPages[s.value] = 1;
        nextHasMore[s.value] = result.length === PAGE_SIZE;
      });
      setTasks(nextTasks);
      setPages(nextPages);
      setHasMore(nextHasMore);
    } finally {
      setLoading(false);
    }
  }, [filters, search]);

  const loadMore = useCallback(
    async (status: string) => {
      const tab = statusTabs.find((s) => s.value === status);
      if (!tab) return;
      const nextPage = pages[status] + 1;
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (filters.assignee) params.append('ownerId', filters.assignee);
        if (filters.priority) params.append('priority', filters.priority);
        if (filters.dueFrom) params.append('dueFrom', filters.dueFrom);
        if (filters.dueTo) params.append('dueTo', filters.dueTo);
        if (filters.sort) params.append('sort', filters.sort);
        if (search) params.append('q', search);
        tab.query.forEach((st) => params.append('status', st));
        params.append('limit', PAGE_SIZE.toString());
        params.append('page', nextPage.toString());
        let result: Task[] = [];
        try {
          const res = await fetch(`/api/tasks?${params.toString()}`);
          if (res.ok) {
            result = (await res.json()) as Task[];
          }
        } catch {
          result = [];
        }
        setTasks((prev) => ({
          ...prev,
          [status]: [...prev[status], ...result],
        }));
        setPages((prev) => ({ ...prev, [status]: nextPage }));
        setHasMore((prev) => ({
          ...prev,
          [status]: result.length === PAGE_SIZE,
        }));
      } finally {
        setLoading(false);
      }
    },
    [filters, search, pages]
  );

  useEffect(() => {
    if (status === 'unauthenticated' && !isLoading) {
      router.push('/login');
    }
  }, [isLoading, router, status]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    void loadTasks();
  }, [loadTasks, status]);

  useEffect(() => {
    const handle = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(handle);
  }, [searchInput]);

  if (status === 'loading') {
    return <div className="p-4 md:p-6">Loading tasks…</div>;
  }

  if (status === 'unauthenticated') {
    return null;
  }

  const listTasks = statusTabs.flatMap((s) => tasks[s.value] ?? []);

  const formatDueDate = (dueDate?: string) => {
    if (!dueDate) return '—';
    const date = new Date(dueDate);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold text-slate-800">Tasks</h1>
        <input
          type="text"
          placeholder="Search"
          className="w-full max-w-xs rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
            {viewTabs.map((tab) => {
              const isActive = view === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setView(tab.value)}
                  className={`inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-inset ring-indigo-200 hover:bg-indigo-100'
                      : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-700'
                  }`}
                  aria-pressed={isActive}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
          <Link
            href="/tasks/new"
            className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500"
          >
            Create Task
          </Link>
        </div>
      </div>
      <div className="mb-6 flex flex-wrap gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">Sort By</label>
          <select
            className="rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filters.sort}
            onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value }))}
          >
            <option value="">Updated</option>
            <option value="dueDate">Due Date</option>
            <option value="priority">Priority</option>
            <option value="createdAt">Created</option>
            <option value="title">Title</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">Assignee</label>
          <select
            className="rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filters.assignee}
            onChange={(e) =>
              setFilters((f) => ({ ...f, assignee: e.target.value }))
            }
          >
            <option value="">All</option>
            {user?.userId && <option value={user.userId}>Me</option>}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">Priority</label>
          <select
            className="rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filters.priority}
            onChange={(e) =>
              setFilters((f) => ({ ...f, priority: e.target.value }))
            }
          >
            <option value="">All</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">From</label>
          <input
            type="date"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filters.dueFrom}
            onChange={(e) =>
              setFilters((f) => ({ ...f, dueFrom: e.target.value }))
            }
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">To</label>
          <input
            type="date"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filters.dueTo}
            onChange={(e) =>
              setFilters((f) => ({ ...f, dueTo: e.target.value }))
            }
          />
        </div>
      </div>
      {view === 'board' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {statusTabs.map((s) => {
            const columnTasks = tasks[s.value] ?? [];
            const isInitialLoading =
              loading && columnTasks.length === 0 && pages[s.value] === 1;
            const isLoadingMore = loading && !isInitialLoading;
            return (
              <TaskKanbanColumn
                key={s.value}
                label={s.label}
                tasks={columnTasks}
                isLoading={isInitialLoading}
                hasMore={hasMore[s.value]}
                isLoadingMore={isLoadingMore}
                onLoadMore={() => loadMore(s.value)}
                onTaskChange={loadTasks}
                currentUserId={user?.userId}
              />
            );
          })}
        </div>
      )}

      {view === 'list' && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-sm text-slate-700">
              {listTasks.length === 0 && !loading && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-sm text-slate-500">
                    No tasks found for the selected filters.
                  </td>
                </tr>
              )}
              {loading && listTasks.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-sm text-slate-500">
                    Loading tasks…
                  </td>
                </tr>
              )}
              {listTasks.map((task) => (
                <tr key={task._id} className="hover:bg-indigo-50/40">
                  <td className="px-4 py-3 font-medium text-slate-800">{task.title}</td>
                  <td className="px-4 py-3 uppercase tracking-wide text-xs text-slate-500">
                    {task.status.replaceAll('_', ' ')}
                  </td>
                  <td className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
                    {task.priority}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">{formatDueDate(task.dueDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {view === 'calendar' && (
        <div className="rounded-xl border border-dashed border-indigo-200 bg-indigo-50/50 p-10 text-center text-sm font-medium text-indigo-700">
          Calendar view is coming soon. Switch back to the board or list to continue managing tasks.
        </div>
      )}
    </div>
  );
}

export default function TasksPage() {
  return (
    <SessionProvider>
      <TasksPageInner />
    </SessionProvider>
  );
}

