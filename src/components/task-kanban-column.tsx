'use client';

import { motion } from 'framer-motion';
import TaskCard from '@/components/task-card';
import type { TaskResponse as Task } from '@/types/api/task';
import { cn } from '@/lib/utils';

export interface TaskKanbanColumnProps {
  label: string;
  tasks: Task[];
  isLoading?: boolean;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void | Promise<void>;
  onTaskChange?: () => void | Promise<void>;
  currentUserId?: string;
}

export default function TaskKanbanColumn({
  label,
  tasks,
  isLoading = false,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
  onTaskChange,
  currentUserId,
}: TaskKanbanColumnProps) {
  const cardTasks = tasks ?? [];
  const isEmpty = !isLoading && cardTasks.length === 0;
  const normalizedStatus = label.trim().toUpperCase().replace(/\s+/g, '_');

  const statusAccent = getStatusAccentStyles(normalizedStatus);
  const completedTasks = cardTasks.filter((task) => task.status === 'DONE').length;
  const progressPercentage = cardTasks.length
    ? Math.round((completedTasks / cardTasks.length) * 100)
    : 0;

  return (
    <section className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 shadow-sm md:max-h-[70vh]">
      <header className="flex flex-col gap-3 border-b border-gray-200 bg-white px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold uppercase tracking-wide text-gray-600">
            {label}
          </div>
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold',
              statusAccent.badge
            )}
          >
            {cardTasks.length} tasks
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200">
            <div
              className={cn('h-full rounded-full transition-all duration-300 ease-out', statusAccent.progress)}
              style={{ width: `${progressPercentage}%` }}
              aria-hidden
            />
          </div>
          <span className="text-xs font-medium text-gray-500">{progressPercentage}%</span>
        </div>
      </header>
      <div className="flex-1 overflow-hidden">
        <div className="flex h-full flex-col px-4 py-4 md:overflow-y-auto">
          {isLoading ? (
            <ul className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <li
                  key={i}
                  className="h-24 animate-pulse rounded-xl border border-gray-200 bg-gray-100"
                />
              ))}
            </ul>
          ) : isEmpty ? (
            <div className="py-6 text-center text-sm text-gray-500">
              No tasks found.
            </div>
          ) : (
            <div className="space-y-3">
              {cardTasks.map((task) => {
                const extendedTask = task as Task & { assignee?: string };
                const canEdit = Boolean(
                  currentUserId &&
                    (currentUserId === task.createdBy ||
                      currentUserId === task.ownerId)
                );
                const isSelected = Boolean(
                  currentUserId &&
                    (currentUserId === task.ownerId || currentUserId === extendedTask.assignee)
                );
                return (
                  <motion.div
                    key={task._id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    className={cn(
                      'group rounded-xl ring-1 ring-transparent ring-offset-2 ring-offset-gray-50 transition duration-200',
                      'hover:-translate-y-0.5 hover:ring-2 hover:ring-indigo-200 hover:shadow-md',
                      'focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-300 focus-within:shadow-md',
                      isSelected && 'ring-2 ring-indigo-300 shadow-md'
                    )}
                    data-selected={isSelected}
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
                      canEdit={canEdit}
                    />
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {hasMore && onLoadMore && (
        <div className="border-t border-gray-200 bg-white px-4 py-3">
          <button
            className="w-full rounded-md border border-gray-200 bg-gray-100 px-3 py-2 text-sm font-medium text-gray-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
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

function getStatusAccentStyles(
  status: string
): { badge: string; progress: string } {
  switch (status) {
    case 'OPEN':
      return {
        badge: 'bg-sky-100 text-sky-700',
        progress: 'bg-sky-500',
      };
    case 'IN_PROGRESS':
    case 'IN_REVIEW':
    case 'REVISIONS':
    case 'FLOW_IN_PROGRESS':
      return {
        badge: 'bg-amber-100 text-amber-700',
        progress: 'bg-amber-500',
      };
    case 'DONE':
      return {
        badge: 'bg-emerald-100 text-emerald-700',
        progress: 'bg-emerald-500',
      };
    default:
      return {
        badge: 'bg-indigo-100 text-indigo-700',
        progress: 'bg-indigo-500',
      };
  }
}
