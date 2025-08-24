import { addClient } from '@/lib/ws';

export async function GET(request: Request) {
  const upgrade = request.headers.get('upgrade');
  if (upgrade?.toLowerCase() !== 'websocket') {
    return new Response('Expected websocket', { status: 400 });
  }
  const { 0: client, 1: server } = Object.values(new WebSocketPair()) as unknown as [
    WebSocket,
    WebSocket
  ];
  server.accept();
  addClient(server);
  return new Response(null, { status: 101, webSocket: client });
}
