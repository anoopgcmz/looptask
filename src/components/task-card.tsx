'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Avatar } from '@/components/ui/avatar';
import { Badge, type BadgeProps } from '@/components/ui/badge';

export interface TaskCardProps {
  task: {
    _id: string;
    title: string;
    assignee?: string;
    assigneeAvatar?: string;
    dueDate?: string;
    priority?: string;
    status: string;
  };
  onChange?: () => void;
  href?: string;
  canEdit?: boolean;
}

const getBadgeVariant = (value?: string): BadgeProps['variant'] => {
  if (!value) return 'secondary';

  const normalized = value.toLowerCase();
  const sanitized = normalized.replace(/[_-]/g, ' ');

  if (['success', 'done', 'completed', 'complete'].includes(sanitized)) {
    return 'success';
  }

  if (
    ['in progress', 'in-progress', 'progress', 'doing'].some(
      (state) => sanitized === state
    )
  ) {
    return 'inProgress';
  }

  if (['backlog', 'todo', 'to do'].includes(sanitized)) {
    return 'backlog';
  }

  if (['urgent', 'high'].includes(sanitized)) {
    return 'urgent';
  }

  if (['low', 'low priority'].includes(sanitized)) {
    return 'low';
  }

  return 'secondary';
};

export default function TaskCard({ task, onChange, href, canEdit = true }: TaskCardProps) {
  const router = useRouter();
  const normalizedStatus = task.status?.trim().toUpperCase();
  const isDone = normalizedStatus === 'DONE';
  const showActions = canEdit && !isDone;

  const handleEdit = () => {
    if (!showActions) return;
    router.push(`/tasks/${task._id}/edit`);
  };

  const handleDelete = async () => {
    if (!showActions) return;
    await fetch(`/api/tasks/${task._id}`, { method: 'DELETE' });
    onChange?.();
  };

  const cardContent = (
    <div className="flex w-full items-center gap-3">
      {task.assignee && (
        <Avatar
          src={task.assigneeAvatar}
          fallback={task.assignee.charAt(0)}
        />
      )}
      <div className="flex flex-col">
        <span className="text-sm font-semibold text-[#111827]">{task.title}</span>
        <div className="flex flex-wrap items-center gap-2 text-xs text-[#4B5563]">
          {task.assignee && <span>{task.assignee}</span>}
          {task.dueDate && <span>Due {task.dueDate}</span>}
          {task.priority && (
            <Badge variant={getBadgeVariant(task.priority)}>{task.priority}</Badge>
          )}
          <Badge variant={getBadgeVariant(task.status)}>{task.status}</Badge>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-3 rounded-[12px] border border-[#E5E7EB] bg-white p-4 shadow-sm transition-all hover:border-indigo-200 hover:shadow-[0_12px_24px_rgba(79,70,229,0.12)] focus-within:border-indigo-200 focus-within:shadow-[0_12px_24px_rgba(79,70,229,0.12)]">
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
      {showActions ? (
        <div className="mt-2 flex justify-end gap-2 sm:justify-start">
          <button
            type="button"
            onClick={() => handleEdit()}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#E5E7EB] text-[#4B5563] transition-colors hover:bg-[rgba(79,70,229,0.08)] hover:text-[#4338CA] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/30 focus:ring-offset-2 focus:ring-offset-white"
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
            onClick={() => void handleDelete()}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#FECACA] text-[#DC2626] transition-colors hover:bg-[#FEE2E2] hover:text-[#B91C1C] focus:outline-none focus:ring-2 focus:ring-[#DC2626]/30 focus:ring-offset-2 focus:ring-offset-white"
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
  );
}

