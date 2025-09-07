import { useCallback, useEffect, useRef, useState } from 'react';
import { isRealtimeMessage } from '@/hooks/useRealtime';

interface User {
  _id: string;
  name?: string;
}

export default function useTyping(
  taskId: string,
  userId?: string,
  enabled = true
) {
  const wsRef = useRef<WebSocket | null>(null);
  const usersRef = useRef<Record<string, User>>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [, setVersion] = useState(0);

  useEffect(() => {
    if (!taskId || !enabled) return;
    const url = `${window.location.origin.replace(/^http/, 'ws')}/api/ws?taskId=${taskId}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;
    const localTimers = timers.current;
    ws.addEventListener('message', (event) => {
      try {
        const data: unknown = JSON.parse(event.data);
        if (!isRealtimeMessage(data) || data.taskId !== taskId) return;
        if (data.event === 'comment.typing') {
          const uid: string = (data as any).userId;
          if (!uid || uid === userId) return;
          if (!usersRef.current[uid]) {
            usersRef.current[uid] = { _id: uid };
            (async () => {
              try {
                const res = await fetch(`/api/users/${uid}`);
                if (!res.ok) return;
                const user: User = await res.json();
                usersRef.current[user._id] = user;
                setVersion((v) => v + 1);
              } catch {
                /* ignore */
              }
            })();
          }
          setVersion((v) => v + 1);
          clearTimeout(timers.current[uid]);
          timers.current[uid] = setTimeout(() => {
            delete timers.current[uid];
            setVersion((v) => v + 1);
          }, 3000);
        }
      } catch {
        // ignore
      }
    });
    return () => {
      ws.close();
      Object.values(localTimers).forEach(clearTimeout);
    };
  }, [taskId, userId, enabled]);

  const emit = useCallback(() => {
    if (!userId) return;
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(
          JSON.stringify({ event: 'comment.typing', taskId, userId })
        );
      } catch (err) {
        console.error('WebSocket send failed', err);
        ws.dispatchEvent(new Event('error'));
      }
    }
  }, [taskId, userId]);

  const typingUsers = Object.entries(timers.current)
    .filter(([uid]) => uid !== userId)
    .map(([uid]) => usersRef.current[uid] || { _id: uid });

  return { typingUsers, emit };
}

