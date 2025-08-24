'use client';
import { useState } from 'react';
import { TaskCard } from '@/components/task-card';
import { Button } from '@/components/ui/button';

const tasks = [
  {
    id: '1',
    title: 'Design landing',
    owner: 'Alice',
    status: 'OPEN',
    priority: 'HIGH',
    due: '2024-06-01',
    updatedAt: '2024-05-20',
  },
  {
    id: '2',
    title: 'Implement auth',
    owner: 'Bob',
    status: 'IN_PROGRESS',
    priority: 'MEDIUM',
    due: '2024-05-25',
    updatedAt: '2024-05-23',
  },
];

export default function TasksPage() {
  const [sort, setSort] = useState<'due' | 'updated'>('due');
  const sorted = [...tasks].sort((a, b) =>
    sort === 'due'
      ? new Date(a.due).getTime() - new Date(b.due).getTime()
      : new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
  return (
    <div className="flex">
      <aside className="w-60 border-r p-4 space-y-6">
        <div>
          <div className="font-medium mb-2">Filters</div>
          <div className="flex flex-col gap-1 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" /> Open
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" /> In Progress
            </label>
          </div>
        </div>
        <div>
          <div className="font-medium mb-2">Sort</div>
          <div className="flex flex-col gap-2">
            <Button
              variant={sort === 'due' ? 'default' : 'outline'}
              onClick={() => setSort('due')}
            >
              Due (asc)
            </Button>
            <Button
              variant={sort === 'updated' ? 'default' : 'outline'}
              onClick={() => setSort('updated')}
            >
              Updated (desc)
            </Button>
          </div>
        </div>
      </aside>
      <main className="flex-1 p-4 flex flex-col gap-2">
        {sorted.map((t) => (
          <TaskCard key={t.id} task={{ ...t, due: new Date(t.due).toLocaleDateString() }} />
        ))}
      </main>
    </div>
  );
}
