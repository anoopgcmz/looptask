'use client';
import { useEffect, useState } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StepsProgress } from '@/components/steps-progress';
import useTaskChannel from '@/hooks/useTaskChannel';

export default function TaskPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [comments, setComments] = useState<any[]>([]);
  const [body, setBody] = useState('');
  const [status, setStatus] = useState<
    'OPEN' | 'IN_PROGRESS' | 'IN_REVIEW' | 'REVISIONS' | 'DONE'
  >('OPEN');

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
    <div className="flex">
      <main className="flex-1 p-4 space-y-4">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Task {id}</h1>
            <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
              <Avatar fallback="A" />
              <span>Alice</span>
              <Badge>{new Date().toLocaleDateString()}</Badge>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              disabled={status !== 'OPEN'}
              onClick={() => setStatus('IN_PROGRESS')}
            >
              Start
            </Button>
            <Button
              disabled={status !== 'IN_PROGRESS'}
              onClick={() => setStatus('IN_REVIEW')}
            >
              Send for review
            </Button>
            <Button
              disabled={status !== 'IN_REVIEW'}
              onClick={() => setStatus('REVISIONS')}
            >
              Request changes
            </Button>
            <Button
              disabled={!(status === 'IN_REVIEW' || status === 'REVISIONS')}
              onClick={() => setStatus('DONE')}
            >
              Done
            </Button>
          </div>
        </header>
        <StepsProgress current={1} total={3} />
        <section>
          <h2 className="font-medium mb-2">Description</h2>
          <p className="text-sm text-gray-600">Task description...</p>
        </section>
        <section>
          <h2 className="font-medium mb-2">Attachments</h2>
          <p className="text-sm text-gray-600">No attachments</p>
        </section>
        <section>
          <h2 className="font-medium mb-2">Comments</h2>
          <ul className="flex flex-col gap-1 mb-2">
            {comments.map((c) => (
              <li key={c._id}>{c.body}</li>
            ))}
          </ul>
          <form onSubmit={submit} className="flex gap-2">
            <Input
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write a comment"
            />
            <Button type="submit">Send</Button>
          </form>
        </section>
      </main>
      <aside className="w-60 border-l p-4 space-y-4">
        <div>
          <h3 className="font-medium mb-2">Followers</h3>
          <p className="text-sm text-gray-600">None</p>
        </div>
        <div>
          <h3 className="font-medium mb-2">Tags</h3>
          <p className="text-sm text-gray-600">-</p>
        </div>
      </aside>
    </div>
  );
}
