'use client';
import { useEffect, useState } from 'react';

interface Objective {
  _id: string;
  title: string;
  status: string;
}

export default function ObjectivesPage() {
  const [initialDate] = new Date().toISOString().split('T');
  const [date, setDate] = useState(initialDate ?? '');
  const [teamId, setTeamId] = useState('');
  const [objectives, setObjectives] = useState<Objective[]>([]);

  useEffect(() => {
    if (!teamId) return;
    const run = async () => {
      try {
        const res = await fetch(`/api/objectives?date=${date}&teamId=${teamId}`);
        if (!res.ok) {
          setObjectives([]);
          return;
        }
        setObjectives((await res.json()) as Objective[]);
      } catch {
        setObjectives([]);
      }
    };
    void run();
  }, [date, teamId]);

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">Objectives</h1>
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
      <ul className="list-disc pl-6">
        {objectives.map((o) => (
          <li key={o._id}>
            {o.title} - {o.status}
          </li>
        ))}
      </ul>
    </div>
  );
}

