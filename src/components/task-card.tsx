'use client';

import * as React from 'react';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
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
}

export default function TaskCard({ task, onChange }: TaskCardProps) {
  const handleMarkComplete = async () => {
    await fetch(`/api/tasks/${task._id}/transition`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'DONE' }),
    });
    onChange?.();
  };

  const handleEdit = async () => {
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
    await fetch(`/api/tasks/${task._id}`, { method: 'DELETE' });
    onChange?.();
  };

  return (
    <div className="rounded border p-4 flex flex-col gap-2 bg-white">
      <div className="flex items-center gap-3">
        {task.assignee && (
          <Avatar
            src={task.assigneeAvatar}
            fallback={task.assignee.charAt(0)}
          />
        )}
        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-700">{task.title}</span>
          <div className="text-xs text-gray-500 flex gap-2">
            {task.assignee && <span>{task.assignee}</span>}
            {task.dueDate && <span>Due {task.dueDate}</span>}
            {task.priority && <span>{task.priority}</span>}
            <Badge>{task.status}</Badge>
          </div>
        </div>
      </div>
      <div className="flex gap-2 mt-2">
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
    </div>
  );
}

