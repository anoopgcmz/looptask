import { useEffect, useRef, useState } from 'react';
import { isRealtimeMessage } from '@/hooks/useRealtime';

interface Viewer {
  _id: string;
  name?: string;
  avatar?: string;
}

export default function usePresence(taskId: string) {
  const viewersRef = useRef<Record<string, Viewer>>({});
  const [, setVersion] = useState(0);

  useEffect(() => {
    if (!taskId) return;
    const url = `${window.location.origin.replace(/^http/, 'ws')}/api/ws?taskId=${taskId}`;
    const ws = new WebSocket(url);

    const update = () => setVersion((v) => v + 1);

    ws.addEventListener('message', (event) => {
      try {
        const data: unknown = JSON.parse(event.data);
        if (!isRealtimeMessage(data) || data.taskId !== taskId) return;
        if (data.event === 'user.joined') {
          const userId: string = (data as any).userId;
          if (!viewersRef.current[userId]) {
            viewersRef.current[userId] = { _id: userId };
            update();
            (async () => {
              try {
                const res = await fetch(`/api/users/${userId}`);
                if (!res.ok) return;
                const user: Viewer = await res.json();
                viewersRef.current[user._id] = user;
                update();
              } catch {
                /* ignore */
              }
            })();
          }
        } else if (data.event === 'user.left') {
          const userId: string = (data as any).userId;
          if (viewersRef.current[userId]) {
            delete viewersRef.current[userId];
            update();
          }
        }
      } catch {
        // ignore
      }
    });

    return () => {
      ws.close();
    };
  }, [taskId]);

  return Object.values(viewersRef.current);
}
