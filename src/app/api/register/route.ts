import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { Types } from 'mongoose';
import dbConnect from '@/lib/db';
import Organization from '@/models/Organization';
import User from '@/models/User';
import { problem } from '@/lib/http';

const registerSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  password: z.string(),
  organizationId: z.string().optional(),
  organizationName: z.string().optional(),
});

export async function POST(req: NextRequest) {
  let body: z.infer<typeof registerSchema>;
  try {
    body = registerSchema.parse(await req.json());
  } catch (e: unknown) {
    const err = e as Error;
    return problem(400, 'Invalid request', err.message);
  }

  await dbConnect();

  let organizationId: Types.ObjectId;

  if (body.organizationId) {
    const org = await Organization.findById(body.organizationId).lean();
    if (!org) {
      return problem(400, 'Invalid request', 'Organization not found');
    }
    organizationId = new Types.ObjectId(body.organizationId);
  } else if (body.organizationName) {
    const domain = body.organizationName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-');
    try {
      const org = await Organization.create({ name: body.organizationName, domain });
      organizationId = org._id;
    } catch (e: unknown) {
      const err = e as Error & { code?: number };
      if (err.code === 11000) {
        return problem(409, 'Conflict', 'Organization already exists');
      }
      if (err.name === 'ValidationError') {
        return problem(400, 'Invalid request', err.message);
      }
      return problem(500, 'Internal Server Error', 'Unexpected error');
    }
  } else {
    return problem(400, 'Invalid request', 'Organization is required');
  }

  const username = body.email.split('@')[0];

  try {
    const user = await User.create({
      name: body.name,
      email: body.email,
      username,
      password: body.password,
      organizationId,
    });
    return NextResponse.json({ id: user._id }, { status: 201 });
  } catch (e: unknown) {
    const err = e as Error & { code?: number };
    if (err.code === 11000) {
      return problem(409, 'Conflict', 'User already exists');
    }
    if (err.name === 'ValidationError') {
      return problem(400, 'Invalid request', err.message);
    }
    return problem(500, 'Internal Server Error', 'Unexpected error');
  }
}
