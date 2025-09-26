import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import dbConnect from '@/lib/db';
import { Organization } from '@/models/Organization';
import { User } from '@/models/User';
import { problem } from '@/lib/http';

const domainPattern = /^(?!-)(?:[a-zA-Z0-9-]{1,63}\.)+[a-zA-Z]{2,}$/;

const adminRegisterSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(200, 'Name is too long')
    .transform((value) => value.trim()),
  email: z.string().email('Email must be valid').transform((value) => value.toLowerCase()),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(200, 'Password is too long'),
  organizationName: z
    .string()
    .min(1, 'Organization name is required')
    .max(200, 'Organization name is too long')
    .transform((value) => value.trim()),
  organizationDomain: z
    .string()
    .min(1, 'Domain is required')
    .max(255, 'Domain is too long')
    .regex(domainPattern, 'Domain must be a valid hostname')
    .transform((value) => value.toLowerCase()),
});

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  let body: z.infer<typeof adminRegisterSchema>;
  try {
    body = adminRegisterSchema.parse(await req.json());
  } catch (e: unknown) {
    const err = e as Error;
    return problem(400, 'Invalid request', err.message);
  }

  await dbConnect();

  const existingOrganization = await Organization.findOne({
    domain: body.organizationDomain,
  }).lean();

  if (existingOrganization) {
    return problem(409, 'Conflict', 'An organization with this domain already exists.');
  }

  let organization;
  try {
    organization = await Organization.create({
      name: body.organizationName,
      domain: body.organizationDomain,
    });
  } catch (e: unknown) {
    const err = e as Error & { code?: number };
    if (err.code === 11000) {
      return problem(409, 'Conflict', 'An organization with this domain already exists.');
    }
    return problem(500, 'Internal Server Error', 'Failed to create organization');
  }

  const [usernameBase] = body.email.split('@');
  const sanitizedBase = usernameBase.replace(/[^a-zA-Z0-9._-]/g, '').toLowerCase();
  const basePrefix = (sanitizedBase || 'admin').slice(0, 24);
  let usernameCandidate = basePrefix || `admin-${crypto.randomBytes(2).toString('hex')}`;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    // eslint-disable-next-line no-await-in-loop
    const existingUser = await User.exists({ username: usernameCandidate });
    if (!existingUser) {
      break;
    }
    const suffix = crypto.randomBytes(2).toString('hex');
    usernameCandidate = `${basePrefix}-${suffix}`.slice(0, 40);
  }

  try {
    const user = await User.create({
      name: body.name,
      email: body.email,
      username: usernameCandidate,
      password: body.password,
      organizationId: organization._id,
      role: 'ADMIN',
    });
    return NextResponse.json({ id: user._id.toString() }, { status: 201 });
  } catch (e: unknown) {
    const err = e as Error & { code?: number };

    await organization.deleteOne().catch(() => {});

    if (err.code === 11000) {
      return problem(409, 'Conflict', 'An account with this email or username already exists.');
    }
    if (err.name === 'ValidationError') {
      return problem(400, 'Invalid request', err.message);
    }
    return problem(500, 'Internal Server Error', 'Failed to create admin user');
  }
}

