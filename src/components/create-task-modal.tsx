'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { Task } from './kanban/task-card';

interface CreateTaskModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (task: Omit<Task, 'id'>) => void;
}

export default function CreateTaskModal({ open, onClose, onCreate }: CreateTaskModalProps) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'Low',
    assignee: '',
    due: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate({
      title: form.title,
      assignee: form.assignee,
      priority: form.priority as Task['priority'],
      status: 'todo',
      description: form.description,
      due: form.due,
    });
    setForm({ title: '', description: '', priority: 'Low', assignee: '', due: '' });
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-full max-w-md rounded-md bg-[var(--color-surface)] p-6 shadow-lg">
        <h2 className="mb-4 text-lg font-medium text-[var(--color-text)]">Create Task</h2>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Input
            placeholder="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
          <Textarea
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="mb-1 block text-sm">Priority</label>
              <select
                className="w-full rounded border border-[var(--color-border)] px-2 py-1"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
              >
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-sm">Assignee</label>
              <Input
                value={form.assignee}
                onChange={(e) => setForm({ ...form, assignee: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm">Due Date</label>
            <Input
              type="date"
              value={form.due}
              onChange={(e) => setForm({ ...form, due: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Create</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
