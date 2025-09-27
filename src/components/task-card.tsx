'use client';

import * as React from 'react';
import Link from 'next/link';
import { Avatar } from '@/components/ui/avatar';
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
    project?: {
      name: string;
      typeName?: string;
    };
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

export default function TaskCard({ task, href }: TaskCardProps) {
  const combinedTags = React.useMemo(
    () =>
      [...(task.tags ?? []), task.status].filter(
        (tag): tag is string => Boolean(tag)
      ),
    [task.tags, task.status]
  );

  const cardContent = (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-medium text-slate-900 line-clamp-2">
          {task.title}
        </h3>
        {task.priority && (
          <span
            className={cn(
              'inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize',
              getPriorityBadgeClasses(task.priority)
            )}
          >
            {task.priority}
          </span>
        )}
      </div>
      {task.project ? (
        <div className="flex items-center gap-2 text-xs text-slate-500">
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
            <path d="M3 10h18v10H3z" />
            <path d="M7 10V6a2 2 0 012-2h6a2 2 0 012 2v4" />
          </svg>
          <span className="font-medium text-slate-700">{task.project.name}</span>
          {task.project.typeName ? (
            <span className="text-slate-400">• {task.project.typeName}</span>
          ) : null}
        </div>
      ) : null}
      {task.description && (
        <p className="text-sm text-[#6b7280] line-clamp-2">{task.description}</p>
      )}
      {combinedTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {combinedTags.map((tag) => (
            <span
              key={`${task._id}-${tag}`}
              className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
      <div className="mt-auto flex items-center justify-between gap-3 pt-1 text-sm">
        <div className="flex items-center gap-2 text-slate-700">
          {task.assignee && (
            <>
              <Avatar
                {...(task.assigneeAvatar ? { src: task.assigneeAvatar } : {})}
                fallback={task.assignee.charAt(0)}
                className="h-6 w-6 text-xs"
              />
              <span className="font-medium">{task.assignee}</span>
            </>
          )}
        </div>
        {task.dueDate && (
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path d="M10 2a6 6 0 100 12A6 6 0 0010 2zM9.25 5.5a.75.75 0 011.5 0V9a.75.75 0 01-.22.53l-1.5 1.5a.75.75 0 11-1.06-1.06l1.28-1.28V5.5z" />
            </svg>
            <span className="text-slate-600">Due {task.dueDate}</span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="group flex flex-col rounded-[10px] bg-white p-4 shadow-sm transition-shadow duration-200 hover:shadow-lg focus-within:shadow-lg">
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

