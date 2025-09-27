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
    <div className="flex gap-6 overflow-x-auto pb-6">
      <section className="min-w-80 shrink-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm ring-1 ring-black/5">
        <header
          className={cn(
            'flex flex-col gap-4 px-5 py-5 text-white',
            statusAccent.header
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-white/80">
                <span
                  className={cn('h-2.5 w-2.5 rounded-full', statusAccent.dot)}
                  aria-hidden
                />
                {label}
              </span>
              <p className="mt-2 text-sm font-medium text-white/90">
                {cardTasks.length} tasks
              </p>
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/10 px-3 py-1 text-xs font-medium text-white/90 shadow-sm transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path d="M10 4.167v11.666" />
                <path d="M4.167 10h11.666" />
              </svg>
              Add task
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/30">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-300 ease-out',
                  statusAccent.progress
                )}
                style={{ width: `${progressPercentage}%` }}
                aria-hidden
              />
            </div>
            <span className="text-xs font-semibold text-white/90">
              {progressPercentage}%
            </span>
          </div>
        </header>
        <div className="flex max-h-[70vh] flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
            {isLoading ? (
              <ul className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <li
                    key={i}
                    className="h-28 animate-pulse rounded-2xl border border-white/40 bg-white/30"
                  />
                ))}
              </ul>
            ) : isEmpty ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/40 bg-white/10 px-6 py-10 text-center text-sm text-slate-100">
                <p className="font-medium text-white/80">No tasks found.</p>
                <p className="mt-1 text-xs text-white/70">
                  Start by creating a new item for this stage.
                </p>
              </div>
            ) : (
              cardTasks.map((task) => {
                const extendedTask = task as Task & { assignee?: string };
                const canEdit = Boolean(
                  currentUserId &&
                    (currentUserId === task.createdBy || currentUserId === task.ownerId)
                );
                const isSelected = Boolean(
                  currentUserId &&
                    (currentUserId === task.ownerId || currentUserId === extendedTask.assignee)
                );
                return (
                  <motion.div
                    key={task._id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className={cn(
                      'group rounded-2xl ring-1 ring-transparent ring-offset-2 ring-offset-white transition duration-200',
                      'hover:-translate-y-0.5 hover:ring-2 hover:ring-white/80 hover:shadow-[0_20px_45px_rgba(15,23,42,0.18)]',
                      'focus-within:outline-none focus-within:ring-2 focus-within:ring-white focus-within:shadow-[0_18px_40px_rgba(15,23,42,0.16)]',
                      isSelected && 'ring-2 ring-white shadow-[0_18px_40px_rgba(15,23,42,0.16)]'
                    )}
                    data-selected={isSelected}
                  >
                    <TaskCard
                      task={{
                        _id: task._id,
                        title: task.title,
                        description: (task as Task & { description?: string }).description,
                        assignee: extendedTask.assignee || task.ownerId,
                        assigneeAvatar: (task as Task & { assigneeAvatar?: string }).assigneeAvatar,
                        dueDate: task.dueDate,
                        priority: task.priority,
                        status: task.status,
                        tags: (task as Task & { tags?: string[] }).tags,
                      }}
                      href={`/tasks/${task._id}`}
                      onChange={onTaskChange}
                      canEdit={canEdit}
                    />
                  </motion.div>
                );
              })
            )}
          </div>
          <div className="border-t border-dashed border-white/30 px-5 py-4">
            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-white/70 py-3 text-sm font-medium text-slate-500 transition-colors hover:border-slate-300 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path d="M10 4.167v11.666" />
                <path d="M4.167 10h11.666" />
              </svg>
              Add task
            </button>
          </div>
        </div>
        {hasMore && onLoadMore && (
          <div className="border-t border-slate-200 bg-white px-5 py-3">
            <button
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => void onLoadMore()}
              disabled={isLoadingMore}
            >
              {isLoadingMore ? 'Loading…' : 'Load more'}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function getStatusAccentStyles(
  status: string
): { header: string; dot: string; progress: string } {
  switch (status) {
    case 'OPEN':
      return {
        header: 'bg-red-500',
        dot: 'bg-white',
        progress: 'bg-white',
      };
    case 'IN_PROGRESS':
    case 'FLOW_IN_PROGRESS':
      return {
        header: 'bg-blue-500',
        dot: 'bg-white',
        progress: 'bg-white',
      };
    case 'IN_REVIEW':
    case 'REVIEW':
    case 'REVISIONS':
      return {
        header: 'bg-yellow-500',
        dot: 'bg-slate-900/80',
        progress: 'bg-white',
      };
    case 'DONE':
      return {
        header: 'bg-green-500',
        dot: 'bg-white',
        progress: 'bg-white',
      };
    default:
      return {
        header: 'bg-slate-600',
        dot: 'bg-white/80',
        progress: 'bg-white',
      };
  }
}
