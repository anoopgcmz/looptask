import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Objective from '@/models/Objective';
import { auth } from '@/lib/auth';
import { problem } from '@/lib/http';

export async function PATCH(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.userId) {
    return problem(401, 'Unauthorized', 'You must be signed in.');
  }
  await dbConnect();
  const { id } = params;
  const objective = await Objective.findById(id);
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

