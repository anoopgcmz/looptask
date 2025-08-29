import { NextResponse } from 'next/server';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const now = Date.now();
  const events = [
    {
      id: '1',
      type: 'CREATED',
      user: { name: 'Alice', avatar: '/avatars/alice.png' },
      date: new Date(now - 1000 * 60 * 60 * 24).toISOString(),
    },
    {
      id: '2',
      type: 'ASSIGNED',
      user: { name: 'Bob', avatar: '/avatars/bob.png' },
      date: new Date(now - 1000 * 60 * 60 * 12).toISOString(),
    },
    {
      id: '3',
      type: 'ACCEPTED',
      user: { name: 'Bob', avatar: '/avatars/bob.png' },
      date: new Date(now - 1000 * 60 * 60 * 6).toISOString(),
    },
    {
      id: '4',
      type: 'REASSIGNED',
      user: { name: 'Charlie', avatar: '/avatars/charlie.png' },
      date: new Date(now - 1000 * 60 * 60 * 3).toISOString(),
    },
    {
      id: '5',
      type: 'COMPLETED',
      user: { name: 'Charlie', avatar: '/avatars/charlie.png' },
      date: new Date(now - 1000 * 60 * 30).toISOString(),
    },
  ];
  // For now, return static events. In a real app, load events from database using id.
  return NextResponse.json(events);
}
