'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface TaskCardProps {
  task: {
    _id: string;
    title: string;
    description?: string;
    assignee?: string;
    assigneeAvatar?: string;
    dueDate?: string;
    priority?: string;
    status: string;
    tags?: string[];
  };
  onChange?: () => void;
  href?: string;
  canEdit?: boolean;
}

const getPriorityBadgeClasses = (priority?: string) => {
  if (!priority) return '';

  const normalized = priority.trim().toLowerCase();

  if (['urgent', 'critical', 'high'].includes(normalized)) {
    return 'bg-rose-100 text-rose-600';
  }

  if (['medium', 'normal'].includes(normalized)) {
    return 'bg-amber-100 text-amber-700';
  }

  if (['low', 'minor'].includes(normalized)) {
    return 'bg-emerald-100 text-emerald-600';
  }

  return 'bg-slate-100 text-slate-600';
};

export default function TaskCard({ task, onChange, href, canEdit = true }: TaskCardProps) {
  const router = useRouter();
  const normalizedStatus = task.status?.trim().toUpperCase();
  const isDone = normalizedStatus === 'DONE';
  const showActions = canEdit && !isDone;
  const combinedTags = React.useMemo(
    () =>
      [...(task.tags ?? []), task.status].filter(
        (tag): tag is string => Boolean(tag)
      ),
    [task.tags, task.status]
  );

  const handleEdit = () => {
    if (!showActions) return;
    router.push(`/tasks/${task._id}/edit`);
  };

  const handleDelete = async () => {
    if (!showActions) return;
    await fetch(`/api/tasks/${task._id}`, { method: 'DELETE' });
    onChange?.();
  };

  const handleEditClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    handleEdit();
  };

  const handleDeleteClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    await handleDelete();
  };

  const cardContent = (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-slate-800 line-clamp-1">
            {task.title}
          </h3>
          {task.description && (
            <p className="mt-1 text-sm text-slate-500 line-clamp-2">
              {task.description}
            </p>
          )}
        </div>
        {task.priority && (
          <span
            className={cn(
              'inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide',
              getPriorityBadgeClasses(task.priority)
            )}
          >
            {task.priority}
          </span>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {combinedTags.map((tag) => (
          <Badge
            key={`${task._id}-${tag}`}
            className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-slate-600"
          >
            {tag}
          </Badge>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {task.assignee && (
            <Avatar
              src={task.assigneeAvatar}
              fallback={task.assignee.charAt(0)}
              className="h-8 w-8 text-sm"
            />
          )}
          <div className="flex flex-col text-xs text-slate-500">
            {task.assignee && (
              <span className="font-medium text-slate-700">{task.assignee}</span>
            )}
            {task.dueDate && <span>Due {task.dueDate}</span>}
          </div>
        </div>
        {showActions ? (
          <div className="flex items-center gap-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
            <button
              type="button"
              onClick={handleEditClick}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:ring-offset-2 focus:ring-offset-white"
              aria-label="Edit task"
              title="Edit task"
            >
              <span className="sr-only">Edit task</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
              >
                <path d="M16.862 4.487l1.651-1.651a1.875 1.875 0 112.652 2.652L7.1 19.554a3 3 0 01-1.265.757l-2.5.75.75-2.5a3 3 0 01.757-1.265L16.862 4.487z" />
                <path d="M15 5.25l3 3" />
              </svg>
            </button>
            <button
              type="button"
              onClick={handleDeleteClick}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-200 text-rose-500 transition-colors hover:bg-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-400/40 focus:ring-offset-2 focus:ring-offset-white"
              aria-label="Delete task"
              title="Delete task"
            >
              <span className="sr-only">Delete task</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
              >
                <path d="M9.75 9.75l.347 8.347a1 1 0 00.996.903h2.214a1 1 0 00.996-.903L14.65 9.75" />
                <path d="M19.5 6h-15" />
                <path d="M16.5 6l-.427-1.708A2 2 0 0014.127 3h-4.254a2 2 0 00-1.946 1.292L7.5 6" />
              </svg>
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );

  return (
    <div className="group flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_35px_rgba(15,23,42,0.15)] focus-within:-translate-y-0.5 focus-within:shadow-[0_18px_35px_rgba(15,23,42,0.15)]">
      {href ? (
        <Link
          href={href}
          className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
        >
          {cardContent}
        </Link>
      ) : (
        cardContent
      )}
    </div>
  );
}

