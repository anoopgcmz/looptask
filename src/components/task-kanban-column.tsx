'use client';

import { motion } from 'framer-motion';
import TaskCard from '@/components/task-card';
import type { TaskResponse as Task } from '@/types/api/task';

export interface TaskKanbanColumnProps {
  label: string;
  tasks: Task[];
  isLoading?: boolean;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void | Promise<void>;
  onTaskChange?: () => void | Promise<void>;
}

export default function TaskKanbanColumn({
  label,
  tasks,
  isLoading = false,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
  onTaskChange,
}: TaskKanbanColumnProps) {
  const cardTasks = tasks ?? [];
  const isEmpty = !isLoading && cardTasks.length === 0;

  return (
    <section className="flex flex-col overflow-hidden rounded-xl border bg-slate-50 shadow-sm md:max-h-[70vh]">
      <header className="flex items-center justify-between border-b bg-white px-4 py-3">
        <div className="text-sm font-semibold uppercase tracking-wide text-slate-600">
          {label}
        </div>
        <span className="text-xs text-slate-400">{cardTasks.length}</span>
      </header>
      <div className="flex-1 overflow-hidden">
        <div className="flex h-full flex-col px-4 py-3 md:overflow-y-auto">
          {isLoading ? (
            <ul className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <li key={i} className="h-24 animate-pulse rounded-lg bg-slate-200/70" />
              ))}
            </ul>
          ) : isEmpty ? (
            <div className="py-6 text-center text-sm text-slate-400">
              No tasks found.
            </div>
          ) : (
            <div className="space-y-3">
              {cardTasks.map((task) => {
                const extendedTask = task as Task & { assignee?: string };
                return (
                  <motion.div
                    key={task._id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                  >
                    <TaskCard
                      task={{
                        _id: task._id,
                        title: task.title,
                        assignee: extendedTask.assignee || task.ownerId,
                        dueDate: task.dueDate,
                        priority: task.priority,
                        status: task.status,
                      }}
                      href={`/tasks/${task._id}`}
                      onChange={onTaskChange}
                    />
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {hasMore && onLoadMore && (
        <div className="border-t bg-white px-4 py-3">
          <button
            className="w-full rounded-md border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => void onLoadMore()}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </section>
  );
}
