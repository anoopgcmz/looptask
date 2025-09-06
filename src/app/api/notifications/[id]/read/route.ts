import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import dbConnect from '@/lib/db';
import Notification from '@/models/Notification';
import { auth } from '@/lib/auth';

interface Params {
  params: { id: string };
}

export async function POST(request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = params;
  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  let read = true;
  try {
    const body = await request.json();
    if (typeof body.read === 'boolean') {
      read = body.read;
    }
  } catch {
    // ignore invalid json and default to true
  }

  await dbConnect();
  const update: any = { read };
  update.readAt = read ? new Date() : null;
  const notification = await Notification.findOneAndUpdate(
    { _id: id, userId: session.userId },
    update,
    { new: true }
  );

  if (!notification) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(notification);
}
