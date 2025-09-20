'use client';

import { useCallback, useEffect, useState } from 'react';
import { SessionProvider } from 'next-auth/react';
import { motion } from 'framer-motion';
import TaskKanbanColumn from '@/components/task-kanban-column';
import type { TaskResponse as Task } from '@/types/api/task';
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

function DashboardInner() {
  const { user, status } = useAuth();
  const [tasks, setTasks] = useState<Record<string, Task[]>>({
    OPEN: [],
    IN_PROGRESS: [],
    DONE: [],
  });
  const [loading, setLoading] = useState(false);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.all(
        statusTabs.map(async (s) => {
          try {
            const res = await fetch(
              `/api/tasks?${s.query.map((st) => `status=${st}`).join('&')}`
            );
            if (!res.ok) return [] as Task[];
            return (await res.json()) as Task[];
          } catch {
            return [] as Task[];
          }
        })
      );
      const next: Record<string, Task[]> = {};
      statusTabs.forEach((s, i) => {
        next[s.value] = results[i] as Task[];
      });
      setTasks(next);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  if (status === 'loading') {
    return <div className="p-4 md:p-6">Loading dashboard…</div>;
  }

  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <div className="p-4 md:p-6">
      <motion.h1
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-xl font-semibold text-slate-800"
      >
        Hi, {user?.name || user?.email || 'there'}
      </motion.h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statusTabs.map((s) => {
          const columnTasks = tasks[s.value] ?? [];
          const isInitialLoading = loading && columnTasks.length === 0;

          return (
            <TaskKanbanColumn
              key={s.value}
              label={s.label}
              tasks={columnTasks}
              isLoading={isInitialLoading}
              onTaskChange={loadTasks}
            />
          );
        })}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <SessionProvider>
      <DashboardInner />
    </SessionProvider>
  );
}

