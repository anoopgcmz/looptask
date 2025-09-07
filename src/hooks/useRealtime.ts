import { useEffect, useState } from 'react';

export type ConnectionStatus = 'connecting' | 'connected' | 'offline';

export interface RealtimeMessage {
  taskId: string;
  event: string;
  patch?: unknown;
  updatedAt?: string;
  [key: string]: unknown;
}

type MessageHandler = (data: RealtimeMessage) => void;

interface Options {
  onMessage?: MessageHandler;
}

const subscribers = new Set<MessageHandler>();
const statusSubscribers = new Set<(s: ConnectionStatus) => void>();

let status: ConnectionStatus = 'offline';
let ws: WebSocket | null = null;
let es: EventSource | null = null;
let backoff = 1000;
let heartbeatInterval: ReturnType<typeof setInterval> | undefined;
let heartbeatTimeout: ReturnType<typeof setTimeout> | undefined;

const HEARTBEAT_INTERVAL = 30000;
const HEARTBEAT_TIMEOUT = 10000;
const MAX_BACKOFF = 30000;

export function isRealtimeMessage(data: unknown): data is RealtimeMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    'event' in data &&
    typeof (data as { event: unknown }).event === 'string' &&
    'taskId' in data &&
    typeof (data as { taskId: unknown }).taskId === 'string'
  );
}

function notifyStatus(s: ConnectionStatus) {
  status = s;
  statusSubscribers.forEach((cb) => cb(s));
}

function flushQueue() {
  const raw = localStorage.getItem('offlineQueue');
  if (!raw) return;
  const parsed = JSON.parse(raw) as unknown;
  const queue = Array.isArray(parsed)
    ? (parsed as { url: string; init?: RequestInit }[])
    : [];
  const process = async () => {
    while (queue.length) {
      const item = queue[0];
      try {
        await fetch(item.url, item.init);
        queue.shift();
      } catch {
        break;
      }
    }
    if (queue.length) {
      localStorage.setItem('offlineQueue', JSON.stringify(queue));
    } else {
      localStorage.removeItem('offlineQueue');
    }
  };
  void process();
}

function startHeartbeat() {
  clearHeartbeat();
  heartbeatInterval = setInterval(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify({ event: 'ping' }));
        } catch (err) {
          console.error('WebSocket ping failed', err);
          ws.dispatchEvent(new Event('error'));
        }
        if (heartbeatTimeout) clearTimeout(heartbeatTimeout);
        heartbeatTimeout = setTimeout(() => {
          try {
            ws?.close();
          } catch {}
        }, HEARTBEAT_TIMEOUT);
      }
  }, HEARTBEAT_INTERVAL);
}

function handlePong() {
  if (heartbeatTimeout) {
    clearTimeout(heartbeatTimeout);
    heartbeatTimeout = undefined;
  }
}

function clearHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = undefined;
  }
  if (heartbeatTimeout) {
    clearTimeout(heartbeatTimeout);
    heartbeatTimeout = undefined;
  }
}

function reconnect() {
  notifyStatus('offline');
  clearHeartbeat();
  const delay = backoff;
  backoff = Math.min(backoff * 2, MAX_BACKOFF);
  setTimeout(connect, delay);
}

function connect() {
  notifyStatus('connecting');
  try {
    const url = `${window.location.origin.replace(/^http/, 'ws')}/api/ws`;
    ws = new WebSocket(url);
    ws.onopen = () => {
      backoff = 1000;
      notifyStatus('connected');
      flushQueue();
      startHeartbeat();
    };
    ws.onmessage = (event) => {
      if (event.data === 'pong') {
        handlePong();
        return;
      }
      try {
        const data: unknown = JSON.parse(event.data);
        if (isRealtimeMessage(data)) {
          subscribers.forEach((cb) => cb(data));
        }
      } catch {}
    };
    ws.onerror = () => {
      try {
        ws?.close();
      } catch {}
    };
    ws.onclose = () => {
      ws = null;
      reconnect();
    };
  } catch {
    fallbackToSse();
  }
}

function fallbackToSse() {
  try {
    const url = `${window.location.origin}/api/sse`;
    es = new EventSource(url);
    es.onopen = () => {
      backoff = 1000;
      notifyStatus('connected');
      flushQueue();
    };
    es.onmessage = (event) => {
      try {
        const data: unknown = JSON.parse(event.data);
        if (isRealtimeMessage(data)) {
          subscribers.forEach((cb) => cb(data));
        }
      } catch {}
    };
    es.onerror = () => {
      es?.close();
      es = null;
      reconnect();
    };
  } catch {
    reconnect();
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    flushQueue();
    if (!ws && !es) connect();
  });
  window.addEventListener('offline', () => {
    notifyStatus('offline');
  });
  if (!navigator.onLine) {
    notifyStatus('offline');
  }
}

interface OfflineResponse {
  ok: false;
  offline: true;
}

export function enqueue(url: string, init?: RequestInit): Promise<Response | OfflineResponse> {
  if (status === 'connected') {
    return fetch(url, init);
  }
  const raw = localStorage.getItem('offlineQueue');
  const parsed = raw ? (JSON.parse(raw) as unknown) : [];
  const queue: { url: string; init?: RequestInit }[] = Array.isArray(parsed)
    ? (parsed as { url: string; init?: RequestInit }[])
    : [];
  queue.push({ url, init });
  localStorage.setItem('offlineQueue', JSON.stringify(queue));
  return Promise.resolve<OfflineResponse>({ ok: false, offline: true });
}

export default function useRealtime({ onMessage }: Options = {}) {
  const [conn, setConn] = useState<ConnectionStatus>(status);

  useEffect(() => {
    if (onMessage) subscribers.add(onMessage);
    const statusCb = (s: ConnectionStatus) => setConn(s);
    statusSubscribers.add(statusCb);

    if (!ws && !es) connect();

    return () => {
      if (onMessage) subscribers.delete(onMessage);
      statusSubscribers.delete(statusCb);
    };
  }, [onMessage]);

  return { status: conn, enqueue };
}

