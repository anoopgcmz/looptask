import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  await dbConnect();
  const user = await User.findById(params.id).lean();
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(user);
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const data = await req.json();
  await dbConnect();
  const user = await User.findByIdAndUpdate(params.id, data, { new: true, runValidators: true });
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(user);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await dbConnect();
  await User.findByIdAndDelete(params.id);
  return NextResponse.json({ ok: true });
}
