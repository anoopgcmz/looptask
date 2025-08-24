'use client';
import { useEffect, useState } from 'react';

export default function DailyDashboardPage() {
  const [date, setDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [teamId, setTeamId] = useState('');
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!teamId) return;
    fetch(`/api/dashboard/daily?date=${date}&teamId=${teamId}`)
      .then((res) => res.json())
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
              {data.summary.map((s: any) => (
                <li key={s.ownerId}>
                  {s.ownerId}: {s.completed}/{s.total}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="font-semibold">Pending Objectives</h2>
            <ul className="list-disc pl-6">
              {data.pending.map((o: any) => (
                <li key={o._id}>{o.title}</li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="font-semibold">Tasks Due Today</h2>
            {data.tasks.map((group: any) => (
              <div key={group.ownerId} className="pl-4">
                <h3 className="font-medium">{group.ownerId}</h3>
                <ul className="list-disc pl-6">
                  {group.tasks.map((t: any) => (
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

