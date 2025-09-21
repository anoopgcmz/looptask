'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import useAuth from '@/hooks/useAuth';
import useTyping from '@/hooks/useTyping';
import useRealtime from '@/hooks/useRealtime';
import { cn } from '@/lib/utils';

interface EnqueueResponse {
  ok?: boolean;
  offline?: boolean;
}

interface Comment {
  _id: string;
  content: string;
  taskId: string;
  userId: string;
  createdAt: string;
  parentId?: string | null;
}

interface CommentUser {
  _id: string;
  name?: string;
  email?: string;
  avatar?: string;
}

function isComment(value: unknown): value is Comment {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj._id === 'string' &&
    typeof obj.content === 'string' &&
    typeof obj.taskId === 'string' &&
    typeof obj.userId === 'string' &&
    typeof obj.createdAt === 'string'
  );
}

function isCommentUser(value: unknown): value is CommentUser {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return typeof obj._id === 'string';
}

interface CommentThreadProps {
  taskId: string;
  parentId?: string;
  className?: string;
}

export default function CommentThread({
  taskId,
  parentId,
  className,
}: CommentThreadProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [userMap, setUserMap] = useState<Record<string, CommentUser>>({});
  const [newContent, setNewContent] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  const { user } = useAuth();
  const { typingUsers, emit } = useTyping(taskId, user?.userId, !parentId);
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);
  const { enqueue } = useRealtime();
  const userMapRef = useRef(userMap);

  useEffect(() => {
    userMapRef.current = userMap;
  }, [userMap]);

  const fetchUsers = useCallback(async (ids: string[]) => {
    const unique = Array.from(new Set(ids.filter(Boolean)));
    if (!unique.length) return;
    try {
      const res = await fetch(`/api/users?${unique.map((id) => `id=${id}`).join('&')}`);
      if (!res.ok) return;
      const json: unknown = await res.json();
      if (!Array.isArray(json)) return;
      const map = json
        .filter(isCommentUser)
        .reduce<Record<string, CommentUser>>((acc, u) => {
          acc[u._id] = u;
          return acc;
        }, {});
      if (Object.keys(map).length) {
        setUserMap((prev) => ({ ...prev, ...map }));
      }
    } catch {
      /* ignore */
    }
  }, []);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ taskId });
    if (parentId) params.set('parentId', parentId);
    const res = await fetch(`/api/comments?${params.toString()}`);
    if (!res.ok) return;
    const json: unknown = await res.json();
    if (!Array.isArray(json)) {
      setComments([]);
      return;
    }
    const parsed = json.filter(isComment);
    setComments(parsed);
    const missing = parsed
      .map((comment) => comment.userId)
      .filter((id) => id && !userMapRef.current[id]);
    if (missing.length) {
      void fetchUsers(missing);
    }
  }, [taskId, parentId, fetchUsers]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    return () => {
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
    };
  }, []);

  const displayUsers = useMemo(
    () =>
      typingUsers.map((u) => {
        const known = userMapRef.current[u._id];
        return {
          ...u,
          name: known?.name || known?.email || u.name || 'Someone',
        };
      }),
    [typingUsers]
  );

  const handleCreate = useCallback(
    async (pid?: string | null) => {
      const content = (pid ? replyContent : newContent).trim();
      if (!content) return;
      const res: EnqueueResponse = await enqueue('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, content, parentId: pid ?? undefined }),
      });
      if (res.ok || res.offline) {
        if (pid) {
          setReplyContent('');
          setReplyingTo(null);
        } else {
          setNewContent('');
        }
      }
      if (res.ok) {
        await load();
      }
    },
    [enqueue, load, newContent, replyContent, taskId]
  );

  const formatTimestamp = useCallback((value: string) => {
    try {
      return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(value));
    } catch {
      return value;
    }
  }, []);

  const renderComment = useCallback(
    (comment: Comment) => {
      const author = userMap[comment.userId];
      const name = author?.name || author?.email || 'Unknown user';
      const avatarFallback = name ? name.charAt(0).toUpperCase() : undefined;
      return (
        <div key={comment._id} className="flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <Avatar
              src={author?.avatar}
              fallback={avatarFallback}
              className="h-9 w-9 flex-shrink-0"
            />
            <div className="flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="text-sm font-semibold text-[#111827]">{name}</span>
                <time className="text-xs text-[#6B7280]">
                  {formatTimestamp(comment.createdAt)}
                </time>
              </div>
              <div className="mt-2 rounded-2xl bg-[#F3F4F6] px-4 py-3 text-sm text-[#111827] shadow-sm">
                {comment.content}
              </div>
              <div className="mt-2 flex items-center gap-3">
                <button
                  type="button"
                  className="text-xs font-medium text-[#4F46E5] transition hover:text-[#4338CA]"
                  onClick={() => setReplyingTo(comment._id)}
                  disabled={!user}
                >
                  Reply
                </button>
              </div>
            </div>
          </div>
          {replyingTo === comment._id ? (
            <div className="ml-12">
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder={user ? 'Write a reply…' : 'Sign in to reply'}
                  disabled={!user}
                  className="min-h-[72px] w-full resize-none rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#4F46E5] focus:outline-none focus:ring-2 focus:ring-[#C7D2FE]"
                />
                <div className="mt-3 flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setReplyingTo(null);
                      setReplyContent('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={() => void handleCreate(comment._id)}
                    disabled={!user || !replyContent.trim()}
                  >
                    Reply
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
          <CommentThread taskId={taskId} parentId={comment._id} />
        </div>
      );
    },
    [formatTimestamp, handleCreate, replyContent, replyingTo, taskId, user, userMap]
  );

  return (
    <div
      className={cn(
        parentId
          ? 'mt-4 space-y-6 border-l border-gray-200 pl-6'
          : 'flex flex-1 flex-col gap-6',
        className
      )}
    >
      <div className={cn('flex flex-col gap-6', parentId ? '' : 'flex-1')}>
        {comments.length ? (
          comments.map((comment) => renderComment(comment))
        ) : parentId ? null : (
          <div className="rounded-xl border border-dashed border-gray-200 bg-[#F9FAFB] px-4 py-6 text-center text-sm text-[#6B7280]">
            No comments yet. Start the conversation!
          </div>
        )}
      </div>
      {!parentId && (
        <form
          className="mt-auto space-y-4 border-t border-gray-200 pt-4"
          onSubmit={(event) => {
            event.preventDefault();
            void handleCreate(null);
          }}
        >
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <textarea
              value={newContent}
              onChange={(e) => {
                setNewContent(e.target.value);
                if (typingTimeout.current) clearTimeout(typingTimeout.current);
                typingTimeout.current = setTimeout(() => {
                  emit();
                }, 300);
              }}
              placeholder={user ? 'Share an update…' : 'Sign in to comment'}
              disabled={!user}
              className="min-h-[96px] w-full resize-none rounded-xl border-0 bg-transparent px-4 py-3 text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-0"
            />
          </div>
          {displayUsers.length ? (
            <div className="text-xs text-[#6B7280]">
              {displayUsers.map((u) => (
                <span key={u._id} className="block">
                  {`${u.name ?? 'Someone'} is typing…`}
                </span>
              ))}
            </div>
          ) : null}
          <div className="flex justify-end">
            <Button type="submit" disabled={!user || !newContent.trim()}>
              Post comment
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
