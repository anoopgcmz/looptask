'use client';
import { useEffect, useState } from 'react';

export default function ObjectivesPage() {
  const [date, setDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [teamId, setTeamId] = useState('');
  const [objectives, setObjectives] = useState<any[]>([]);

  useEffect(() => {
    if (!teamId) return;
    fetch(`/api/objectives?date=${date}&teamId=${teamId}`)
      .then((res) => res.json())
      .then(setObjectives)
      .catch(() => setObjectives([]));
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

