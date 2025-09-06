import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { Types } from 'mongoose';
import dbConnect from '@/lib/db';
import Objective from '@/models/Objective';
import { auth } from '@/lib/auth';
import { problem } from '@/lib/http';

const upsertSchema = z.object({
  id: z.string().optional(),
  date: z.string(),
  teamId: z.string(),
  title: z.string(),
  ownerId: z.string(),
  linkedTaskIds: z.array(z.string()).optional(),
  status: z.enum(['OPEN', 'DONE']).optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.userId) {
    return problem(401, 'Unauthorized', 'You must be signed in.');
  }
  let body: z.infer<typeof upsertSchema>;
  try {
    body = upsertSchema.parse(await req.json());
  } catch (e: any) {
    return problem(400, 'Invalid request', e.message);
  }
  if (session.teamId && session.teamId !== body.teamId) {
    return problem(403, 'Forbidden', 'Wrong team');
  }
  await dbConnect();
  if (body.id) {
    const objective = await Objective.findById(body.id);
    if (!objective) return problem(404, 'Not Found', 'Objective not found');
    if (objective.teamId.toString() !== body.teamId) {
      return problem(403, 'Forbidden', 'Wrong team');
    }
    Object.assign(objective, {
      date: body.date,
      teamId: new Types.ObjectId(body.teamId),
      title: body.title,
      ownerId: new Types.ObjectId(body.ownerId),
      linkedTaskIds: body.linkedTaskIds?.map((id) => new Types.ObjectId(id)) ?? [],
      status: body.status ?? objective.status,
    });
    await objective.save();
    return NextResponse.json(objective);
  }
  const objective = await Objective.create({
    date: body.date,
    teamId: new Types.ObjectId(body.teamId),
    title: body.title,
    ownerId: new Types.ObjectId(body.ownerId),
    linkedTaskIds: body.linkedTaskIds?.map((id) => new Types.ObjectId(id)) ?? [],
    status: body.status ?? 'OPEN',
  });
  return NextResponse.json(objective, { status: 201 });
}

const listQuery = z.object({
  date: z.string(),
  teamId: z.string(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.userId) {
    return problem(401, 'Unauthorized', 'You must be signed in.');
  }
  const url = new URL(req.url);
  let query: z.infer<typeof listQuery>;
  try {
    query = listQuery.parse({
      date: url.searchParams.get('date'),
      teamId: url.searchParams.get('teamId'),
    });
  } catch (e: any) {
    return problem(400, 'Invalid request', e.message);
  }
  if (session.teamId && session.teamId !== query.teamId) {
    return problem(403, 'Forbidden', 'Wrong team');
  }
  await dbConnect();
  const objectives = await Objective.find({
    date: query.date,
    teamId: new Types.ObjectId(query.teamId),
  }).sort({ ownerId: 1 });
  return NextResponse.json(objectives);
}

