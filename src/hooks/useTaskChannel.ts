import { useEffect } from 'react';

export default function useTaskChannel(
  taskId: string,
  onMessage: (task: any) => void
) {
  useEffect(() => {
    if (!taskId) return;
    const url = `${window.location.origin.replace(/^http/, 'ws')}/api/ws`;
    const ws = new WebSocket(url);
    ws.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.event === 'task.transitioned' && data.taskId === taskId) {
          onMessage(data.task);
        }
      } catch {
        // ignore
      }
    });
    return () => {
      ws.close();
    };
  }, [taskId, onMessage]);
}
