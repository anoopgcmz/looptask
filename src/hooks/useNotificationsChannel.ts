import { useEffect } from 'react';

export interface NotificationPayload {
  _id: string;
  userId: string;
  type: string;
  message: string;
  taskId?: string;
  read: boolean;
  readAt: string | null;
  createdAt: string;
}

interface Options {
  onNotification?: (notification: NotificationPayload) => void;
}

export default function useNotificationsChannel({ onNotification }: Options = {}) {
  useEffect(() => {
    const url = `${window.location.origin.replace(/^http/, 'ws')}/api/ws`;
    const ws = new WebSocket(url);
    ws.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data) as {
          event: string;
          notification: NotificationPayload;
        };
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
