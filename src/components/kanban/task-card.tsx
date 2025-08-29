'use client';

import { useMemo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { motion, useReducedMotion, type MotionStyle } from 'framer-motion';
import { spring, timing } from '@/lib/motion';

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
  /** When true the card is rendered inside a drag overlay ghost */
  dragOverlay?: boolean;
}

export default function TaskCard({ task, dragOverlay = false }: TaskCardProps) {
  const prefersReducedMotion = useReducedMotion();

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

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useSortable({ id: task.id });

  const style: MotionStyle | undefined = transform
    ? { x: transform.x, y: transform.y }
    : undefined;

  const variants = {
    initial: { scale: 1, rotateX: 0, rotateY: 0 },
    hover: prefersReducedMotion
      ? { scale: 1 }
      : { scale: 1.03, rotateX: -2, rotateY: 2 },
    press: prefersReducedMotion
      ? { scale: 0.97 }
      : { scale: 0.97, rotateX: 2, rotateY: -2 },
    dragging: prefersReducedMotion
      ? { scale: 1.02 }
      : { scale: 1.05, rotateX: 0, rotateY: 0 },
  } as const;

  return (
    <motion.div
      ref={dragOverlay ? undefined : setNodeRef}
      layoutId={`task-${task.id}`}
      style={!dragOverlay ? style : undefined}
      className={`bg-[var(--color-surface)] rounded-md border border-[var(--color-border)] p-3 shadow-sm transition
 ${isDragging && !dragOverlay ? 'opacity-50' : ''}`}
      variants={variants}
      initial="initial"
      animate={isDragging ? 'dragging' : 'initial'}
      whileHover={dragOverlay ? undefined : 'hover'}
      whileTap={dragOverlay ? undefined : 'press'}
      transition={prefersReducedMotion ? timing.settle : dragOverlay ? spring.ghost : spring.lift}
      {...(dragOverlay ? {} : attributes)}
      {...(dragOverlay ? {} : listeners)}
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
    </motion.div>
  );
}

