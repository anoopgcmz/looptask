import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || '';
  await dbConnect();
  const query = q
    ? {
        $or: [
          { name: { $regex: q, $options: 'i' } },
          { email: { $regex: q, $options: 'i' } },
          { username: { $regex: q, $options: 'i' } },
        ],
      }
    : {};
  const users = await User.find(query).lean();
  return NextResponse.json(users);
}

export async function POST(req: Request) {
  const data = await req.json();
  await dbConnect();
  const user = await User.create(data);
  return NextResponse.json(user, { status: 201 });
}
