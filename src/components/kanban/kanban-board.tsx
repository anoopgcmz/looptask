'use client';
import TaskCard, { Task } from './task-card';

interface KanbanBoardProps {
  tasks: Task[];
  onMove: (id: string, status: Task['status']) => void;
}

const columns: { key: Task['status']; title: string; color: string }[] = [
  { key: 'todo', title: 'To Do', color: 'var(--status-todo)' },
  { key: 'inprogress', title: 'In Progress', color: 'var(--status-inprogress)' },
  { key: 'done', title: 'Done', color: 'var(--status-done)' },
];

export default function KanbanBoard({ tasks, onMove }: KanbanBoardProps) {
  const handleDrop = (e: React.DragEvent<HTMLDivElement>, status: Task['status']) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    if (id) onMove(id, status);
  };

  return (
    <div className="flex gap-4 h-full">
      {columns.map((col) => (
        <div
          key={col.key}
          className="flex-1 flex flex-col rounded-md bg-[var(--color-surface)] border border-[var(--color-border)]"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => handleDrop(e, col.key)}
        >
          <h2
            className="p-3 text-sm font-medium border-b border-[var(--color-border)]"
            style={{ backgroundColor: col.color, color: '#fff' }}
          >
            {col.title}
          </h2>
          <div className="p-3 space-y-2 flex-1 overflow-auto">
            {tasks
              .filter((t) => t.status === col.key)
              .map((t) => (
                <TaskCard key={t.id} task={t} />
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
