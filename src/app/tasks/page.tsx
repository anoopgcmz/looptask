'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { SessionProvider, useSession } from 'next-auth/react';
import type { TaskResponse as Task } from '@/types/api/task';
import TaskKanbanColumn from '@/components/task-kanban-column';

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
            />
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

