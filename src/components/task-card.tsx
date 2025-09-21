'use client';

import * as React from 'react';
import Link from 'next/link';
import { Avatar } from '@/components/ui/avatar';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { openLoopBuilder } from '@/lib/loopBuilder';

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
  const [menuOpen, setMenuOpen] = React.useState(false);

  const handleMarkComplete = async () => {
    if (!canEdit) return;
    await fetch(`/api/tasks/${task._id}/transition`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'DONE' }),
    });
    onChange?.();
  };

  const handleEdit = async () => {
    if (!canEdit) return;
    const title = prompt('New title', task.title);
    if (title) {
      await fetch(`/api/tasks/${task._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      onChange?.();
    }
  };

  const handleDelete = async () => {
    if (!canEdit) return;
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
      {canEdit ? (
        <div className="mt-2">
          <div className="hidden sm:flex gap-2">
            <Button onClick={() => void handleMarkComplete()} className="text-xs">
              Mark Complete
            </Button>
            <Button
              onClick={() => void handleEdit()}
              variant="outline"
              className="text-xs"
            >
              Edit
            </Button>
            <Button
              onClick={() => void handleDelete()}
              variant="outline"
              className="text-xs"
            >
              Delete
            </Button>
            <Button
              onClick={() => openLoopBuilder(task._id)}
              variant="outline"
              className="text-xs"
            >
              Add to Loop
            </Button>
          </div>
          <div className="relative sm:hidden">
            <Button
              onClick={() => setMenuOpen((o) => !o)}
              variant="outline"
              className="p-2"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="More actions"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-4 h-4"
              >
                <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6-2a2 2 0 100 4 2 2 0 000-4zm6 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </Button>
            {menuOpen && (
              <div
                className="absolute right-0 z-10 mt-2 w-40 rounded border bg-white shadow-md"
                role="menu"
              >
                <button
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                  onClick={() => {
                    setMenuOpen(false);
                    void handleMarkComplete();
                  }}
                  role="menuitem"
                >
                  Mark Complete
                </button>
                <button
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                  onClick={() => {
                    setMenuOpen(false);
                    void handleEdit();
                  }}
                  role="menuitem"
                >
                  Edit
                </button>
                <button
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                  onClick={() => {
                    setMenuOpen(false);
                    void handleDelete();
                  }}
                  role="menuitem"
                >
                  Delete
                </button>
                <button
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                  onClick={() => {
                    setMenuOpen(false);
                    openLoopBuilder(task._id);
                  }}
                  role="menuitem"
                >
                  Add to Loop
                </button>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

