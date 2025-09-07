import { addClient } from '@/lib/ws';
import { auth } from '@/lib/auth';
import { type NextRequest } from 'next/server';
import type { WebSocket } from 'ws';

interface MetaWebSocket extends WebSocket {
  userId?: string;
  organizationId?: string;
  taskIds?: string[];
}

export async function GET(request: NextRequest) {
  const upgrade = request.headers.get('upgrade');
  if (upgrade?.toLowerCase() !== 'websocket') {
    return new Response('Expected websocket', { status: 400 });
  }

  const session = await auth();
  if (!session?.userId || !session.organizationId) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const taskIds = searchParams.getAll('taskId');

  const { 0: client, 1: server } = Object.values(new WebSocketPair()) as [
    MetaWebSocket,
    MetaWebSocket
  ];
  server.accept();
  server.userId = session.userId;
  server.organizationId = session.organizationId;
  if (taskIds.length) server.taskIds = taskIds;
  addClient(server);

  const interval = setInterval(() => {
    try {
      server.ping();
    } catch {
      try {
        server.close();
      } catch {
        // ignore
      }
    }
  }, 30000);
  server.addEventListener('close', () => clearInterval(interval));

  return new Response(null, { status: 101, webSocket: client });
}
