'use client';
import * as React from 'react';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

export interface TaskCardMinProps {
  task: {
    id: string;
    title: string;
    assignee: string;
    assigneeAvatar?: string;
    status: 'todo' | 'inprogress' | 'done';
    due?: string;
  };
}

export function TaskCardMin({ task }: TaskCardMinProps) {
  const statusClass = {
    todo: 'bg-[#9CA3AF] text-white',
    inprogress: 'bg-[#F59E0B] text-white',
    done: 'bg-[#10B981] text-white',
  }[task.status];

  return (
    <div className="rounded-xl shadow-sm bg-white p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Avatar src={task.assigneeAvatar} fallback={task.assignee.charAt(0)} />
        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-700">{task.title}</span>
          {task.due && (
            <span className="text-xs text-gray-500">{task.due}</span>
          )}
        </div>
      </div>
      <Badge className={statusClass}>
        {task.status === 'inprogress'
          ? 'In Progress'
          : task.status === 'todo'
          ? 'To Do'
          : 'Done'}
      </Badge>
    </div>
  );
}
