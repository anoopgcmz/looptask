'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { SessionProvider, useSession } from 'next-auth/react';
import type { TaskResponse as Task } from '@/types/api/task';
import TaskCard from '@/components/task-card';

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
  const { data: session } = useSession();
  const [filters, setFilters] = useState({
    assignee: '',
    priority: '',
    dueFrom: '',
    dueTo: '',
    sort: '',
  });
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
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
    void loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    const handle = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(handle);
  }, [searchInput]);

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
        <Link
          href="/tasks/new"
          className="ml-auto inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500"
        >
          Create Task
        </Link>
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
            {session?.userId && <option value={session.userId}>Me</option>}
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statusTabs.map((s) => {
          const columnTasks = tasks[s.value] ?? [];
          const isInitialLoading =
            loading && columnTasks.length === 0 && pages[s.value] === 1;
          return (
            <section
              key={s.value}
              className="flex flex-col overflow-hidden rounded-xl border bg-slate-50 shadow-sm md:max-h-[70vh]"
            >
              <header className="flex items-center justify-between border-b bg-white px-4 py-3">
                <div className="text-sm font-semibold uppercase tracking-wide text-slate-600">
                  {s.label}
                </div>
                <span className="text-xs text-slate-400">{columnTasks.length}</span>
              </header>
              <div className="flex-1 overflow-hidden">
                <div className="flex h-full flex-col px-4 py-3 md:overflow-y-auto">
                  {isInitialLoading ? (
                    <ul className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <li
                          key={i}
                          className="h-24 rounded-lg bg-slate-200/70 animate-pulse"
                        />
                      ))}
                    </ul>
                  ) : columnTasks.length ? (
                    <div className="space-y-3">
                      {columnTasks.map((t) => (
                        <motion.div
                          key={t._id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 6 }}
                        >
                          <TaskCard
                            task={{
                              _id: t._id,
                              title: t.title,
                              assignee: t.assignee || t.ownerId,
                              dueDate: t.dueDate,
                              priority: t.priority,
                              status: t.status,
                            }}
                            href={`/tasks/${t._id}`}
                            onChange={loadTasks}
                          />
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-6 text-center text-sm text-slate-400">
                      No tasks found.
                    </div>
                  )}
                </div>
              </div>
              {hasMore[s.value] && (
                <div className="border-t bg-white px-4 py-3">
                  <button
                    className="w-full rounded-md border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => void loadMore(s.value)}
                    disabled={loading}
                  >
                    {loading ? 'Loading…' : 'Load more'}
                  </button>
                </div>
              )}
            </section>
          );
        })}
      </div>
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

