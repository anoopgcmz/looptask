'use client';
import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { spring, timing } from '@/lib/motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent } from '@/components/ui/dialog';
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
  const prefersReducedMotion = useReducedMotion();
  const [steps, setSteps] = useState<
    { assignee: string; description: string; due: string }[]
  >([]);

  const addStep = () =>
    setSteps((s) => [...s, { assignee: '', description: '', due: '' }]);
  const updateStep = (
    index: number,
    field: 'assignee' | 'description' | 'due',
    value: string
  ) => {
    setSteps((s) => s.map((step, i) => (i === index ? { ...step, [field]: value } : step)));
  };
  const removeStep = (index: number) => {
    setSteps((s) => s.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.title,
        description: form.description,
        ownerId: form.assignee || undefined,
        priority: form.priority.toUpperCase(),
        dueAt: form.due || undefined,
        steps: steps.map((s) => ({
          ownerId: s.assignee,
          description: s.description,
          dueAt: s.due || undefined,
        })),
      }),
    });
    onCreate({
      title: form.title,
      assignee: form.assignee,
      priority: form.priority as Task['priority'],
      status: 'todo',
      description: form.description,
      due: form.due,
    });
    setForm({ title: '', description: '', priority: 'Low', assignee: '', due: '' });
    setSteps([]);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <motion.div
          initial={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={prefersReducedMotion ? timing.settle : spring.ghost}
        >
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
          <div className="space-y-4">
            {steps.map((step, idx) => (
              <div
                key={idx}
                className="rounded border border-[var(--color-border)] p-4 space-y-2"
              >
                <Input
                  placeholder="Step assignee ID"
                  value={step.assignee}
                  onChange={(e) => updateStep(idx, 'assignee', e.target.value)}
                />
                <Textarea
                  placeholder="Step description"
                  value={step.description}
                  onChange={(e) => updateStep(idx, 'description', e.target.value)}
                />
                <Input
                  type="date"
                  value={step.due}
                  onChange={(e) => updateStep(idx, 'due', e.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => removeStep(idx)}
                >
                  Remove Step
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addStep}>
              Add Step
            </Button>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Create</Button>
          </div>
        </form>
      </motion.div>
    </DialogContent>
  </Dialog>
  );
}
