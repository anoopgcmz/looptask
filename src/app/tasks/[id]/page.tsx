'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import useTaskChannel from '@/hooks/useTaskChannel';

interface HistoryEvent {
  id: string;
  type: 'CREATED' | 'ASSIGNED' | 'ACCEPTED' | 'COMPLETED' | 'REASSIGNED';
  user: { name: string; avatar?: string };
  date: string;
}

const statusLabels: Record<HistoryEvent['type'], string> = {
  CREATED: 'Created',
  ASSIGNED: 'Assigned',
  ACCEPTED: 'Accepted',
  COMPLETED: 'Completed',
  REASSIGNED: 'Reassigned',
};

export default function TaskPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [events, setEvents] = useState<HistoryEvent[]>([]);

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/tasks/${id}/history`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      }
    };
    load();
  }, [id]);

  useTaskChannel(id, (data) => {
    if (data.event === 'history.created') {
      setEvents((prev) => [...prev, data.history]);
    }
  });

  return (
    <div className="fixed inset-0 flex flex-col bg-white">
      <header className="border-b p-4">
        <h1 className="text-lg font-semibold">Task {id} Timeline</h1>
      </header>
      <div className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-4">
          <AnimatePresence>
            {events.map((e) => (
              <motion.li
                key={e.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                layout
                className="flex items-center gap-4"
              >
                <Avatar
                  src={e.user.avatar}
                  fallback={e.user.name.charAt(0)}
                />
                <div>
                  <div className="font-medium">{e.user.name}</div>
                  <div className="text-sm text-gray-600 flex items-center gap-2">
                    <Badge>{statusLabels[e.type]}</Badge>
                    <span>{new Date(e.date).toLocaleString()}</span>
                  </div>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </div>
    </div>
  );
}
