import { useCallback, useEffect, useRef, useState } from 'react';

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
    ws.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.taskId !== taskId) return;
        if (data.event === 'comment.typing') {
          const uid: string = data.userId;
          if (!uid || uid === userId) return;
          if (!usersRef.current[uid]) {
            usersRef.current[uid] = { _id: uid };
            fetch(`/api/users/${uid}`)
              .then((res) => (res.ok ? res.json() : null))
              .then((user) => {
                if (user) {
                  usersRef.current[user._id] = user;
                  setVersion((v) => v + 1);
                }
              })
              .catch(() => {});
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
      Object.values(timers.current).forEach(clearTimeout);
    };
  }, [taskId, userId, enabled]);

  const emit = useCallback(() => {
    if (!userId) return;
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({ event: 'comment.typing', taskId, userId })
      );
    }
  }, [taskId, userId]);

  const typingUsers = Object.entries(timers.current)
    .filter(([uid]) => uid !== userId)
    .map(([uid]) => usersRef.current[uid] || { _id: uid });

  return { typingUsers, emit };
}

