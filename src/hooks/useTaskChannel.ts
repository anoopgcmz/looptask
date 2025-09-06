import { useEffect } from 'react';

interface Options {
  refreshTask?: () => void;
  insertComment?: (comment: any) => void;
  refreshLoop?: () => void;
}

export default function useTaskChannel(
  taskId: string,
  { refreshTask, insertComment, refreshLoop }: Options
) {
  useEffect(() => {
    if (!taskId) return;
    const url = `${window.location.origin.replace(/^http/, 'ws')}/api/ws`;
    const ws = new WebSocket(url);
    ws.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.taskId === taskId) {
          switch (data.event) {
            case 'task.updated':
            case 'task.transitioned':
              refreshTask?.();
              break;
            case 'comment.created':
              insertComment?.(data.comment);
              break;
            case 'loop.updated':
              refreshLoop?.();
              break;
            default:
              break;
          }
        }
      } catch {
        // ignore
      }
    });
    return () => {
      ws.close();
    };
  }, [taskId, refreshTask, insertComment, refreshLoop]);
}
