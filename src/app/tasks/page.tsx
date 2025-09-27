'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SessionProvider } from 'next-auth/react';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import StatusBadge from '@/components/status-badge';
import type {
  TaskPriority,
  TaskResponse as Task,
  TaskStatus,
} from '@/types/api/task';
import TaskKanbanColumn from '@/components/task-kanban-column';
import useAuth from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

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

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  HIGH: 'bg-rose-100 text-rose-600 ring-rose-200',
  MEDIUM: 'bg-amber-100 text-amber-700 ring-amber-200',
  LOW: 'bg-emerald-100 text-emerald-600 ring-emerald-200',
};

const KNOWN_STATUSES: readonly TaskStatus[] = [
  'OPEN',
  'IN_PROGRESS',
  'IN_REVIEW',
  'REVISIONS',
  'FLOW_IN_PROGRESS',
  'DONE',
];

const toTaskStatus = (status: string): TaskStatus | null =>
  (KNOWN_STATUSES.includes(status as TaskStatus) ? (status as TaskStatus) : null);

const getDueMeta = (dueDate?: string) => {
  if (!dueDate) {
    return { label: 'No due date', isOverdue: false };
  }
  const date = new Date(dueDate);
  if (Number.isNaN(date.getTime())) {
    return { label: 'No due date', isOverdue: false };
  }
  const formatted = date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const comparisonDate = new Date(date);
  comparisonDate.setHours(23, 59, 59, 999);
  const isOverdue = comparisonDate.getTime() < Date.now();
  return {
    label: `Due ${formatted}`,
    isOverdue,
  };
};

const CalendarIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-5 w-5"
    aria-hidden="true"
  >
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <path d="M16 2v4" />
    <path d="M8 2v4" />
    <path d="M3 10h18" />
  </svg>
);

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

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6 space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Tasks</h1>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <div className="relative flex-1 sm:w-64">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[var(--color-text-secondary)]">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
              </span>
              <Input
                type="search"
                placeholder="Search tasks"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center justify-between gap-2 sm:justify-start">
              <div className="flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-white/80 p-1 shadow-sm">
                {viewTabs.map((tab) => {
                  const isActive = view === tab.value;
                  return (
                    <button
                      key={tab.value}
                      type="button"
                      onClick={() => setView(tab.value)}
                      className={cn(
                        'inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
                        isActive
                          ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-inset ring-indigo-200'
                          : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-700'
                      )}
                      aria-pressed={isActive}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
              <Link
                href="/tasks/new"
                className="inline-flex items-center rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              >
                Create Task
              </Link>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm md:p-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
                Sort By
              </label>
              <Select
                value={filters.sort}
                onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value }))}
              >
                <option value="">Updated</option>
                <option value="dueDate">Due Date</option>
                <option value="priority">Priority</option>
                <option value="createdAt">Created</option>
                <option value="title">Title</option>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
                Assignee
              </label>
              <Select
                value={filters.assignee}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, assignee: e.target.value }))
                }
              >
                <option value="">All</option>
                {user?.userId && <option value={user.userId}>Me</option>}
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
                Priority
              </label>
              <Select
                value={filters.priority}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, priority: e.target.value }))
                }
              >
                <option value="">All</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
                Due From
              </label>
              <Input
                type="date"
                value={filters.dueFrom}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, dueFrom: e.target.value }))
                }
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
                Due To
              </label>
              <Input
                type="date"
                value={filters.dueTo}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, dueTo: e.target.value }))
                }
              />
            </div>
          </div>
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
        <div className="space-y-4">
          {listTasks.length === 0 && !loading ? (
            <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white/80 p-10 text-center text-sm text-[var(--color-text-secondary)]">
              No tasks found for the selected filters.
            </div>
          ) : null}
          {loading && listTasks.length === 0 ? (
            <div className="rounded-2xl border border-[var(--color-border)] bg-white/80 p-10 text-center text-sm text-[var(--color-text-secondary)]">
              Loading tasks…
            </div>
          ) : null}
          {listTasks.map((task) => {
            const extendedTask = task as Task & {
              assignee?: string;
              assigneeAvatar?: string;
            };
            const assigneeName = extendedTask.assignee;
            const assigneeInitial = assigneeName?.[0]?.toUpperCase() ?? '?';
            const status = toTaskStatus(task.status);
            const dueMeta = getDueMeta(task.dueDate);

            return (
              <article
                key={task._id}
                className="group rounded-2xl border border-[var(--color-border)] bg-white/90 p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_35px_rgba(15,23,42,0.12)] focus-within:-translate-y-0.5 focus-within:shadow-[0_18px_35px_rgba(15,23,42,0.12)]"
              >
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                      <h2 className="text-lg font-semibold text-slate-900">{task.title}</h2>
                      {task.description ? (
                        <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
                          {task.description}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {status ? (
                        <StatusBadge status={status} size="sm" />
                      ) : (
                        <Badge className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                          {task.status.replaceAll('_', ' ')}
                        </Badge>
                      )}
                      <Badge
                        className={cn(
                          'rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide shadow-sm ring-1 ring-inset',
                          PRIORITY_STYLES[task.priority] ?? 'bg-slate-100 text-slate-600 ring-slate-200'
                        )}
                      >
                        {task.priority}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={extendedTask.assigneeAvatar}
                        fallback={assigneeInitial}
                        className="h-10 w-10 text-sm"
                      />
                      <div className="flex flex-col text-sm">
                        <span className="font-medium text-slate-900">
                          {assigneeName ?? 'Unassigned'}
                        </span>
                        <span className="text-[var(--color-text-secondary)]">
                          {assigneeName ? 'Primary assignee' : 'Assign a teammate'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                      <CalendarIcon />
                      <span
                        className={cn(
                          'font-medium',
                          dueMeta.isOverdue
                            ? 'text-rose-600'
                            : 'text-[var(--color-text-secondary)]'
                        )}
                      >
                        {dueMeta.label}
                      </span>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
          {loading && listTasks.length > 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white/60 p-6 text-center text-sm text-[var(--color-text-secondary)]">
              Loading tasks…
            </div>
          ) : null}
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

