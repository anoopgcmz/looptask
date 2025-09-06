'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useSession } from 'next-auth/react';
import useTyping from '@/hooks/useTyping';

interface Comment {
  _id: string;
  content: string;
  taskId: string;
  parentId?: string | null;
}

export default function CommentThread({
  taskId,
  parentId,
}: {
  taskId: string;
  parentId?: string;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newContent, setNewContent] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  const { data: session } = useSession();
  const { typingUsers, emit } = useTyping(taskId, session?.userId, !parentId);
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ taskId });
    if (parentId) params.set('parentId', parentId);
    const res = await fetch(`/api/comments?${params.toString()}`);
    if (res.ok) setComments(await res.json());
  }, [taskId, parentId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    return () => {
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
    };
  }, []);

  const handleCreate = async (pid?: string | null) => {
    const content = pid ? replyContent : newContent;
    const res = await fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId, content, parentId: pid ?? undefined }),
    });
    if (res.ok) {
      if (pid) {
        setReplyContent('');
        setReplyingTo(null);
      } else {
        setNewContent('');
      }
      await load();
    }
  };

  return (
    <div className={parentId ? 'ml-4 mt-2' : 'mt-4'}>
      {!parentId && (
        <div className="mb-4">
          <Textarea
            value={newContent}
            onChange={(e) => {
              setNewContent(e.target.value);
              if (typingTimeout.current) clearTimeout(typingTimeout.current);
              typingTimeout.current = setTimeout(() => {
                emit();
              }, 300);
            }}
            placeholder="Add a comment..."
          />
          {typingUsers.map((u) => (
            <p key={u._id} className="mt-1 text-xs text-gray-500">
              {`${u.name ?? 'Someone'} is typing...`}
            </p>
          ))}
          <Button className="mt-1 text-xs" onClick={() => void handleCreate(null)}>
            Comment
          </Button>
        </div>
      )}
      {comments.map((c) => (
        <div key={c._id} className="mb-2">
          <div className="p-2 border rounded">
            <p className="text-sm">{c.content}</p>
            <button
              className="text-xs text-blue-500"
              onClick={() => setReplyingTo(c._id)}
            >
              Reply
            </button>
          </div>
          {replyingTo === c._id && (
            <div className="ml-4 mt-2">
              <Textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
              />
              <Button
                className="mt-1 text-xs"
                onClick={() => void handleCreate(c._id)}
              >
                Submit
              </Button>
            </div>
          )}
          <CommentThread taskId={taskId} parentId={c._id} />
        </div>
      ))}
    </div>
  );
}
