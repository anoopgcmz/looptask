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

  return (
    <section className="flex min-w-80 shrink-0 flex-col rounded-lg bg-[#f9fafb] p-4">
      <header className="flex flex-col">
        <div className="flex items-center gap-2">
          <span className={cn('h-3 w-3 rounded-full', statusAccent.dot)} aria-hidden />
          <h2 className="text-sm font-medium text-slate-900">{label}</h2>
          <span className="ml-auto rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
            {cardTasks.length}
          </span>
        </div>
        <div className="my-4 h-px w-full bg-black" aria-hidden />
      </header>
      <div className="flex max-h-[70vh] flex-1 flex-col overflow-hidden">
        <div className="flex-1 space-y-3 overflow-y-auto scroll-pt-4 scroll-pb-4">
          {isLoading ? (
            <ul className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <li
                  key={i}
                  className="h-28 animate-pulse rounded-lg border border-slate-200 bg-white"
                />
              ))}
            </ul>
          ) : isEmpty ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-500">
              <p className="font-medium text-slate-700">No tasks found.</p>
              <p className="mt-1 text-xs text-slate-500">
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
                    'group rounded-lg ring-1 ring-transparent transition duration-200',
                    'hover:-translate-y-0.5 hover:ring-2 hover:ring-slate-300 hover:shadow-sm',
                    'focus-within:outline-none focus-within:ring-2 focus-within:ring-slate-400 focus-within:shadow-sm',
                    isSelected && 'ring-2 ring-slate-400 shadow-sm'
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
      </div>
      {hasMore && onLoadMore && (
        <div className="mt-4 border-t border-slate-200 pt-4">
          <button
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
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
): { dot: string } {
  switch (status) {
    case 'OPEN':
      return {
        dot: 'bg-red-500',
      };
    case 'IN_PROGRESS':
    case 'FLOW_IN_PROGRESS':
      return {
        dot: 'bg-blue-500',
      };
    case 'IN_REVIEW':
    case 'REVIEW':
    case 'REVISIONS':
      return {
        dot: 'bg-blue-500',
      };
    case 'DONE':
      return {
        dot: 'bg-green-500',
      };
    default:
      return {
        dot: 'bg-slate-400',
      };
  }
}
