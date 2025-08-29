'use client';
import { useState } from 'react';
import TaskCard, { Task } from './task-card';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDroppable,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { motion, useReducedMotion } from 'framer-motion';
import { spring, timing } from '@/lib/motion';

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
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<Task['status'] | null>(null);
  const [isKeyboard, setIsKeyboard] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const prefersReducedMotion = useReducedMotion();

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    setIsKeyboard(event.activatorEvent instanceof KeyboardEvent);
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
      const moved = tasks.find((t) => t.id === active.id);
      const column = columns.find((c) => c.key === status);
      if (moved && column) {
        setAnnouncement(`${moved.title} moved to ${column.title}`);
      }
    }
    setOverId(null);
    setIsKeyboard(false);
  };

  const activeTask = tasks.find((t) => t.id === activeId) || null;

  return (
    <>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        modifiers={isKeyboard ? undefined : [restrictToVerticalAxis]}
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
              animate={
                highlight
                  ? prefersReducedMotion
                    ? { opacity: 0.95 }
                    : { scale: 1.02 }
                  : { opacity: 1, scale: 1 }
              }
              style={highlight ? { boxShadow: `0 0 0 2px ${col.color}` } : undefined}
              transition={prefersReducedMotion ? timing.settle : spring.lift}
            >
              <motion.h2
                className="p-3 text-sm font-medium border-b border-[var(--color-border)]"
                style={{ backgroundColor: col.color, color: '#fff' }}
                animate={
                  highlight
                    ? prefersReducedMotion
                      ? { opacity: 1 }
                      : { scale: 1.05 }
                    : { opacity: 1, scale: 1 }
                }
                transition={prefersReducedMotion ? timing.settle : spring.lift}
              >
                {col.title}
              </motion.h2>
              <div className="p-3 space-y-2 flex-1 overflow-auto">
                <SortableContext
                  items={columnTasks.map((t) => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {columnTasks.map((t) => (
                    <TaskCard key={t.id} task={t} />
                  ))}
                </SortableContext>
              </div>
            </motion.div>
          );
        })}
      </div>
        <DragOverlay dropAnimation={null}>
          {activeTask ? <TaskCard task={activeTask} dragOverlay /> : null}
        </DragOverlay>
      </DndContext>
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </>
  );
}
