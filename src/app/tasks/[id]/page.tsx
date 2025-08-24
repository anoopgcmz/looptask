'use client';

import { useEffect, useState } from 'react';
import useTaskChannel from '@/hooks/useTaskChannel';

export default function TaskPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [comments, setComments] = useState<any[]>([]);
  const [body, setBody] = useState('');

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/comments?taskId=${id}`);
      if (res.ok) {
        const data = await res.json();
        setComments(data);
      }
    };
    load();
  }, [id]);

  useTaskChannel(id, (data) => {
    if (data.event === 'comment.created') {
      setComments((prev) => [data.comment, ...prev]);
    }
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId: id, body }),
    });
    if (res.ok) {
      setBody('');
    }
  };

  return (
    <div className="p-4 flex flex-col gap-2">
      <h1>Task {id}</h1>
      <ul className="flex flex-col gap-1">
        {comments.map((c) => (
          <li key={c._id}>{c.body}</li>
        ))}
      </ul>
      <form onSubmit={submit} className="flex gap-2">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="border p-1 flex-1"
        />
        <button type="submit" className="bg-blue-500 text-white px-2">
          Send
        </button>
      </form>
    </div>
  );
}
