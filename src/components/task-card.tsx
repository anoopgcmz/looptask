'use client';
import * as React from 'react';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface TaskCardProps {
  task: {
    id: string;
    title: string;
    owner: string;
    ownerAvatar?: string;
    status: string;
    priority: string;
    due: string;
  };
}

export function TaskCard({ task }: TaskCardProps) {
  return (
    <div className="border rounded-md p-4 flex justify-between items-center">
      <div>
        <div className="font-medium mb-2">{task.title}</div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Avatar src={task.ownerAvatar} fallback={task.owner.charAt(0)} />
          <span>{task.owner}</span>
          <Badge>{task.status}</Badge>
          <Badge variant="secondary">{task.priority}</Badge>
          <Badge>{task.due}</Badge>
        </div>
      </div>
    </div>
  );
}
