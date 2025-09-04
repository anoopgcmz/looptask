import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Organization from '@/models/Organization';

export async function GET() {
  await dbConnect();
  const organizations = await Organization.find({}, 'name').lean();
  return NextResponse.json(organizations);
}
