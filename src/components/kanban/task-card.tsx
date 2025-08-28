'use client';
import { useMemo } from 'react';

export interface Task {
  id: string;
  title: string;
  assignee: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'todo' | 'inprogress' | 'done';
  description?: string;
  due?: string;
}

interface TaskCardProps {
  task: Task;
}

export default function TaskCard({ task }: TaskCardProps) {
  const priorityColor = useMemo(() => {
    switch (task.priority) {
      case 'High':
        return 'var(--priority-high)';
      case 'Medium':
        return 'var(--priority-medium)';
      default:
        return 'var(--priority-low)';
    }
  }, [task.priority]);

  const statusColor = useMemo(() => {
    switch (task.status) {
      case 'todo':
        return 'var(--status-todo)';
      case 'inprogress':
        return 'var(--status-inprogress)';
      default:
        return 'var(--status-done)';
    }
  }, [task.status]);

  return (
    <div
      draggable
      onDragStart={(e) => e.dataTransfer.setData('text/plain', task.id)}
      className="bg-[var(--color-surface)] rounded-md border border-[var(--color-border)] p-3 shadow-sm hover:shadow transition"
    >
      <div className="text-sm font-medium text-[var(--color-text)]">{task.title}</div>
      <div className="mt-2 flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
        <span>{task.assignee}</span>
        <span
          className="px-2 py-0.5 rounded-full text-white"
          style={{ backgroundColor: priorityColor }}
        >
          {task.priority}
        </span>
        <span
          className="px-2 py-0.5 rounded-full text-white"
          style={{ backgroundColor: statusColor }}
        >
          {task.status === 'inprogress' ? 'In Progress' : task.status === 'todo' ? 'To Do' : 'Done'}
        </span>
      </div>
    </div>
  );
}
