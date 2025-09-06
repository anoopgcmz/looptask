import { addClient } from '@/lib/ws';
import { auth } from '@/lib/auth';

export async function GET(request: Request) {
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

  const { 0: client, 1: server } = Object.values(new WebSocketPair()) as unknown as [
    WebSocket,
    WebSocket
  ];
  server.accept();
  (server as any).userId = session.userId;
  (server as any).organizationId = session.organizationId;
  if (taskIds.length) (server as any).taskIds = taskIds;
  addClient(server as any);

  const interval = setInterval(() => {
    try {
      // @ts-ignore
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
