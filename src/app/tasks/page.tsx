'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface Task {
  _id: string;
  title: string;
  status: string;
}

const statusLabels: Record<string, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  REVISIONS: 'Revisions',
  FLOW_IN_PROGRESS: 'Flow In Progress',
  DONE: 'Done',
};

const statusTabs = [
  { value: 'OPEN', label: 'Open', query: ['OPEN'] },
  {
    value: 'IN_PROGRESS',
    label: 'In Progress',
    query: ['IN_PROGRESS', 'IN_REVIEW', 'REVISIONS', 'FLOW_IN_PROGRESS'],
  },
  { value: 'DONE', label: 'Done', query: ['DONE'] },
];

export default function TasksPage() {
  const [tasks, setTasks] = useState<Record<string, Task[]>>({
    OPEN: [],
    IN_PROGRESS: [],
    DONE: [],
  });

  useEffect(() => {
    async function loadTasks() {
      const results = await Promise.all(
        statusTabs.map((s) =>
          fetch(`/api/tasks?${s.query.map((st) => `status=${st}`).join('&')}`)
            .then((res) => res.json())
            .catch(() => [])
        )
      );
      const next: Record<string, Task[]> = {};
      statusTabs.forEach((s, i) => {
        next[s.value] = results[i] as Task[];
      });
      setTasks(next);
    }
    void loadTasks();
  }, []);

  return (
    <div className="p-4">
      <Tabs defaultValue="OPEN">
        <TabsList>
          {statusTabs.map((s) => (
            <TabsTrigger key={s.value} value={s.value}>
              {s.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {statusTabs.map((s) => (
          <TabsContent key={s.value} value={s.value}>
            <ul className="space-y-2">
              {tasks[s.value]?.map((t) => (
                <motion.li
                  key={t._id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  className="rounded border hover:bg-gray-50"
                >
                  <Link href={`/tasks/${t._id}`} className="block p-2">
                    {t.title}
                    {s.query.length > 1 && (
                      <span className="ml-2 text-xs text-gray-500">
                        {statusLabels[t.status] ?? t.status}
                      </span>
                    )}
                  </Link>
                </motion.li>
              ))}
            </ul>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

