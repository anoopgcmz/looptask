import { useEffect } from 'react';

interface Options {
  onNotification?: (notification: any) => void;
}

export default function useNotificationsChannel({ onNotification }: Options = {}) {
  useEffect(() => {
    const url = `${window.location.origin.replace(/^http/, 'ws')}/api/ws`;
    const ws = new WebSocket(url);
    ws.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.event === 'notification.created') {
          onNotification?.(data.notification);
        }
      } catch {
        // ignore parse errors
      }
    });
    return () => {
      ws.close();
    };
  }, [onNotification]);
}
