import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import dbConnect from '@/lib/db';
import Notification, { type INotification } from '@/models/Notification';
import { auth } from '@/lib/auth';
import { Types, type FilterQuery } from 'mongoose';

const querySchema = z.object({
  type: z.string().optional(),
  read: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const raw: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    raw[key] = value;
  });
  let query: z.infer<typeof querySchema>;
  try {
    query = querySchema.parse(raw);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Invalid request';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  await dbConnect();

  const filter: FilterQuery<INotification> = {
    userId: new Types.ObjectId(session.userId),
  };
  if (query.type) filter.type = query.type;
  if (typeof query.read === 'boolean') filter.read = query.read;
  if (query.startDate || query.endDate) {
    filter.createdAt = {};
    const createdAt = filter.createdAt as Record<string, Date>;
    if (query.startDate) createdAt.$gte = query.startDate;
    if (query.endDate) createdAt.$lte = query.endDate;
  }

  const page = query.page ?? 1;
  const limit = query.limit ?? 50;

  const notifications = await Notification.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
  return NextResponse.json(notifications);
}

