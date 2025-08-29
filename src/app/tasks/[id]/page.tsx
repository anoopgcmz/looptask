'use client';

import { useEffect, useState } from 'react';
import Timeline, { TimelineEvent } from '@/components/timeline/timeline';
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
  const [events, setEvents] = useState<TimelineEvent[]>([]);

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/tasks/${id}/history`);
      if (res.ok) {
        const data: HistoryEvent[] = await res.json();
        setEvents(
          data.map((e) => ({
            user: e.user,
            status: statusLabels[e.type],
            date: e.date,
          }))
        );
      }
    };
    load();
  }, [id]);

  useTaskChannel(id, (data) => {
    if (data.event === 'history.created') {
      const e: HistoryEvent = data.history;
      setEvents((prev) => [
        ...prev,
        {
          user: e.user,
          status: statusLabels[e.type],
          date: e.date,
        },
      ]);
    }
  });

  return (
    <div className="fixed inset-0 flex flex-col bg-white">
      <header className="border-b border-gray-200 p-4">
        <h1 className="text-lg font-semibold">Task {id} Timeline</h1>
      </header>
      <div className="flex-1 overflow-y-auto p-4">
        <Timeline events={events} />
      </div>
    </div>
  );
}
