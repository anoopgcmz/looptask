'use client';

import { useEffect, useState } from 'react';
import { SessionProvider, useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface Task {
  _id: string;
  title: string;
  status: string;
}

const statusTabs = [
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'DONE', label: 'Done' },
];

function DashboardInner() {
  const { data: session } = useSession();
  const [tasks, setTasks] = useState<Record<string, Task[]>>({
    OPEN: [],
    IN_PROGRESS: [],
    DONE: [],
  });

  useEffect(() => {
    async function loadTasks() {
      const results = await Promise.all(
        statusTabs.map((s) =>
          fetch(`/api/tasks?status=${s.value}`)
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
      <motion.h1
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-semibold"
      >
        Hi, {session?.user?.name || session?.user?.email || 'there'}
      </motion.h1>
      <Tabs defaultValue="OPEN" className="mt-6">
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
                  className="rounded border p-2"
                >
                  {t.title}
                </motion.li>
              ))}
            </ul>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <SessionProvider>
      <DashboardInner />
    </SessionProvider>
  );
}

