import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { auth } from '@/lib/auth';
import { problem } from '@/lib/http';

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.organizationId) {
    return problem(401, 'Unauthorized', 'You must be signed in.');
  }
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || '';
  await dbConnect();
  const query: any = {
    organizationId: new Types.ObjectId(session.organizationId),
  };
  if (q) {
    query.$or = [
      { name: { $regex: q, $options: 'i' } },
      { email: { $regex: q, $options: 'i' } },
      { username: { $regex: q, $options: 'i' } },
    ];
  }
  const users = await User.find(query).lean();
  return NextResponse.json(users);
}

export async function POST(req: Request) {
  const data = await req.json();
  await dbConnect();
  const user = await User.create(data);
  return NextResponse.json(user, { status: 201 });
}
