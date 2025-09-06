import { NextResponse, type NextRequest } from 'next/server';
import { Types } from 'mongoose';
import { z } from 'zod';
import dbConnect from '@/lib/db';
import SavedSearch from '@/models/SavedSearch';
import { auth } from '@/lib/auth';

interface Params {
  params: Promise<{ id: string }>;
}

const bodySchema = z.object({
  name: z.string().optional(),
  query: z.string().optional(),
});

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  await dbConnect();
  const search = await SavedSearch.findOne({ _id: id, userId: session.userId });
  if (!search) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json(search);
}

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }

  await dbConnect();
  const search = await SavedSearch.findOneAndUpdate(
    { _id: id, userId: session.userId },
    body,
    { new: true }
  );
  if (!search) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json(search);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  await dbConnect();
  const result = await SavedSearch.deleteOne({ _id: id, userId: session.userId });
  if (result.deletedCount === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
