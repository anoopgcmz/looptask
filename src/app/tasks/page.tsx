'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import TaskCard from '@/components/task-card';
import { useSession } from 'next-auth/react';

interface Task {
  _id: string;
  title: string;
  status: string;
  assignee?: string;
  ownerId?: string;
  dueDate?: string;
  priority?: string;
}

const statusLabels: Record<string, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  REVISIONS: 'Revisions',
  FLOW_IN_PROGRESS: 'Flow In Progress',
  DONE: 'Done',
};

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

export default function TasksPage() {
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

  const loadTasks = useCallback(async () => {
    const results = await Promise.all(
      statusTabs.map((s) => {
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
        return fetch(`/api/tasks?${params.toString()}`)
          .then((res) => res.json())
          .catch(() => []);
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
  }, [filters, search]);

  const loadMore = useCallback(
    async (status: string) => {
      const tab = statusTabs.find((s) => s.value === status);
      if (!tab) return;
      const nextPage = pages[status] + 1;
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
      const result: Task[] = await fetch(`/api/tasks?${params.toString()}`)
        .then((res) => res.json())
        .catch(() => []);
      setTasks((prev) => ({
        ...prev,
        [status]: [...prev[status], ...result],
      }));
      setPages((prev) => ({ ...prev, [status]: nextPage }));
      setHasMore((prev) => ({
        ...prev,
        [status]: result.length === PAGE_SIZE,
      }));
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
    <div className="p-4">
      <div className="mb-4 flex items-center">
        <h1 className="text-xl">Tasks</h1>
        <input
          type="text"
          placeholder="Search"
          className="ml-4 border p-1"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <Link
          href="/tasks/new"
          className="ml-auto bg-blue-500 text-white px-2 py-1"
        >
          Create Task
        </Link>
      </div>
      <div className="mb-4 flex flex-wrap gap-4">
        <div>
          <label className="block text-sm mb-1">Sort By</label>
          <select
            className="border p-1"
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
          <label className="block text-sm mb-1">Assignee</label>
          <select
            className="border p-1"
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
          <label className="block text-sm mb-1">Priority</label>
          <select
            className="border p-1"
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
          <label className="block text-sm mb-1">From</label>
          <input
            type="date"
            className="border p-1"
            value={filters.dueFrom}
            onChange={(e) =>
              setFilters((f) => ({ ...f, dueFrom: e.target.value }))
            }
          />
        </div>
        <div>
          <label className="block text-sm mb-1">To</label>
          <input
            type="date"
            className="border p-1"
            value={filters.dueTo}
            onChange={(e) =>
              setFilters((f) => ({ ...f, dueTo: e.target.value }))
            }
          />
        </div>
      </div>
      <Tabs defaultValue="OPEN">
        <TabsList>
          {statusTabs.map((s) => (
            <TabsTrigger key={s.value} value={s.value}>
              {s.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {statusTabs.map((s) => (
          <TabsContent key={s.value} value={s.value}>
            {tasks[s.value]?.length ? (
              <>
                <ul className="space-y-2">
                  {tasks[s.value]?.map((t) => (
                    <motion.li
                      key={t._id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
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
                        onChange={loadTasks}
                      />
                    </motion.li>
                  ))}
                </ul>
                {hasMore[s.value] && (
                  <button
                    className="mt-4 border px-4 py-2"
                    onClick={() => void loadMore(s.value)}
                  >
                    Load more
                  </button>
                )}
              </>
            ) : (
              <div className="p-4 text-center text-sm text-gray-500">
                No tasks found.
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

