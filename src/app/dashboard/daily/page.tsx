'use client';
import { useEffect, useState } from 'react';

interface SummaryItem {
  ownerId: string;
  completed: number;
  total: number;
}

interface PendingObjective {
  _id: string;
  title: string;
}

interface TaskItem {
  _id: string;
  title: string;
}

interface TaskGroup {
  ownerId: string;
  tasks: TaskItem[];
}

interface DashboardData {
  summary: SummaryItem[];
  pending: PendingObjective[];
  tasks: TaskGroup[];
}

export default function DailyDashboardPage() {
  const [date, setDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [teamId, setTeamId] = useState('');
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    if (!teamId) return;
    fetch(`/api/dashboard/daily?date=${date}&teamId=${teamId}`)
      .then((res) => res.json() as Promise<DashboardData>)
      .then(setData)
      .catch(() => setData(null));
  }, [date, teamId]);

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">Daily Dashboard</h1>
      <div className="space-x-2">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border px-2 py-1"
        />
        <input
          placeholder="Team ID"
          value={teamId}
          onChange={(e) => setTeamId(e.target.value)}
          className="border px-2 py-1"
        />
      </div>
      {data && (
        <div className="space-y-4">
          <div>
            <h2 className="font-semibold">Summary</h2>
            <ul className="list-disc pl-6">
              {data.summary.map((s) => (
                <li key={s.ownerId}>
                  {s.ownerId}: {s.completed}/{s.total}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="font-semibold">Pending Objectives</h2>
            <ul className="list-disc pl-6">
              {data.pending.map((o) => (
                <li key={o._id}>{o.title}</li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="font-semibold">Tasks Due Today</h2>
            {data.tasks.map((group) => (
              <div key={group.ownerId} className="pl-4">
                <h3 className="font-medium">{group.ownerId}</h3>
                <ul className="list-disc pl-6">
                  {group.tasks.map((t) => (
                    <li key={t._id}>{t.title}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

