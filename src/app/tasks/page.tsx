'use client';
import { useState } from 'react';
import Layout from '@/components/layout/layout';
import KanbanBoard from '@/components/kanban/kanban-board';
import CreateTaskModal from '@/components/create-task-modal';
import type { Task } from '@/components/kanban/task-card';

const initialTasks: Task[] = [
  {
    id: '1',
    title: 'Design landing',
    assignee: 'Alice',
    priority: 'High',
    status: 'todo',
  },
  {
    id: '2',
    title: 'Implement auth',
    assignee: 'Bob',
    priority: 'Medium',
    status: 'inprogress',
  },
  {
    id: '3',
    title: 'Release v1',
    assignee: 'Cara',
    priority: 'Low',
    status: 'done',
  },
];

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [open, setOpen] = useState(false);

  const handleMove = (id: string, status: Task['status']) => {
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, status } : t)));
  };

  const handleCreate = (task: Omit<Task, 'id'>) => {
    setTasks((ts) => [...ts, { ...task, id: Date.now().toString() }]);
  };

  return (
    <Layout onNewTask={() => setOpen(true)}>
      <KanbanBoard tasks={tasks} onMove={handleMove} />
      <CreateTaskModal
        open={open}
        onClose={() => setOpen(false)}
        onCreate={handleCreate}
      />
    </Layout>
  );
}
