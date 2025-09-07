import { NextResponse, type NextRequest } from 'next/server';
import dbConnect from '@/lib/db';
import { User } from '@/models/User';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { params } = context;
  const { id } = await params;
  await dbConnect();
  const user = await User.findById(id).lean();
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(user);
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const data = await req.json();
  const { params } = context;
  const { id } = await params;
  await dbConnect();
  const user = await User.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(user);
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { params } = context;
  const { id } = await params;
  await dbConnect();
  await User.findByIdAndDelete(id);
  return NextResponse.json({ ok: true });
}

export const runtime = 'nodejs';
