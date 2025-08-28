'use client';
import { useState } from 'react';
import TaskCard, { Task } from './task-card';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  DragOverlay,
} from '@dnd-kit/core';
import { motion } from 'framer-motion';
import { springTransition } from '@/lib/motion';

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
  const sensors = useSensors(useSensor(PointerSensor));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<Task['status'] | null>(null);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const status = event.over?.id as Task['status'] | undefined;
    setOverId(status ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (over) {
      const status = over.id as Task['status'];
      onMove(active.id as string, status);
    }
    setOverId(null);
  };

  const activeTask = tasks.find((t) => t.id === activeId) || null;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 h-full">
        {columns.map((col) => {
          const { setNodeRef, isOver } = useDroppable({ id: col.key });
          const columnTasks = tasks.filter((t) => t.status === col.key);
          const highlight = isOver || overId === col.key;
          return (
            <motion.div
              key={col.key}
              ref={setNodeRef}
              className="flex-1 flex flex-col rounded-md bg-[var(--color-surface)] border border-[var(--color-border)]"
              animate={{ scale: highlight ? 1.02 : 1 }}
              style={highlight ? { boxShadow: `0 0 0 2px ${col.color}` } : undefined}
              transition={springTransition}
            >
              <motion.h2
                className="p-3 text-sm font-medium border-b border-[var(--color-border)]"
                style={{ backgroundColor: col.color, color: '#fff' }}
                animate={{ scale: highlight ? 1.05 : 1 }}
                transition={springTransition}
              >
                {col.title}
              </motion.h2>
              <div className="p-3 space-y-2 flex-1 overflow-auto">
                {columnTasks.map((t) => (
                  <TaskCard key={t.id} task={t} />
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeTask ? <TaskCard task={activeTask} dragOverlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}
