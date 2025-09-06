import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import dbConnect from '@/lib/db';
import SavedSearch from '@/models/SavedSearch';
import { auth } from '@/lib/auth';
import { getPresets } from '@/app/search/filters';

const bodySchema = z.object({
  name: z.string(),
  query: z.string(),
});

export async function GET() {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();
  const searches = await SavedSearch.find({ userId: session.userId })
    .sort({ createdAt: -1 })
    .lean();
  const presets = getPresets(session.userId);
  return NextResponse.json([...presets, ...searches]);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch (e: unknown) {
    const err = e as Error;
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  await dbConnect();
  const search = await SavedSearch.create({
    userId: session.userId,
    name: body.name,
    query: body.query,
  });
  return NextResponse.json(search, { status: 201 });
}
