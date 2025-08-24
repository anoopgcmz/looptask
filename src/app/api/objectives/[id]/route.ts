import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Objective from '@/models/Objective';
import { auth } from '@/lib/auth';

function problem(status: number, title: string, detail: string) {
  return NextResponse.json({ type: 'about:blank', title, status, detail }, { status });
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.userId) {
    return problem(401, 'Unauthorized', 'You must be signed in.');
  }
  await dbConnect();
  const objective = await Objective.findById(params.id);
  if (!objective) {
    return problem(404, 'Not Found', 'Objective not found');
  }
  if (session.teamId && objective.teamId.toString() !== session.teamId) {
    return problem(403, 'Forbidden', 'Wrong team');
  }
  objective.status = objective.status === 'DONE' ? 'OPEN' : 'DONE';
  await objective.save();
  return NextResponse.json(objective);
}

