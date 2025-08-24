import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Notification from '@/models/Notification';
import { auth } from '@/lib/auth';

export async function GET() {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  await dbConnect();
  const notifications = await Notification.find({
    userId: session.userId,
  })
    .sort({ createdAt: -1 })
    .limit(50);
  return NextResponse.json(notifications);
}

