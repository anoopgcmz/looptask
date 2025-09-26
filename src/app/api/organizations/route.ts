import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { Types } from 'mongoose';
import dbConnect from '@/lib/db';
import { Organization } from '@/models/Organization';
import { Invitation } from '@/models/Invitation';
import { problem } from '@/lib/http';
import { auth } from '@/lib/auth';
import { sendInvitationEmail } from '@/lib/email';

const createOrganizationSchema = z.object({
  name: z
    .string()
    .min(1, 'Organization name is required')
    .max(200, 'Organization name is too long')
    .transform((value) => value.trim()),
  domain: z
    .string()
    .min(1, 'Domain is required')
    .max(255, 'Domain is too long')
    .regex(
      /^(?!-)(?:[a-zA-Z0-9-]{1,63}\.)+[a-zA-Z]{2,}$/,
      'Domain must be a valid hostname'
    )
    .transform((value) => value.toLowerCase()),
  initialAdmin: z.object({
    email: z.string().email('Initial admin email must be valid'),
    role: z.enum(['ADMIN', 'USER']).default('ADMIN'),
  }),
});

export async function GET() {
  await dbConnect();
  const organizations = await Organization.find({}, 'name').lean();
  return NextResponse.json(organizations);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.userId) {
    return problem(401, 'Unauthorized', 'You must be signed in.');
  }

  if (session.role !== 'PLATFORM') {
    return problem(403, 'Forbidden', 'Platform access required.');
  }

  let body: z.infer<typeof createOrganizationSchema>;
  try {
    body = createOrganizationSchema.parse(await req.json());
  } catch (e: unknown) {
    const err = e as Error;
    return problem(400, 'Invalid request', err.message);
  }

  await dbConnect();

  const existing = await Organization.findOne({ domain: body.domain }).lean();
  if (existing) {
    return problem(409, 'Conflict', 'An organization with this domain already exists.');
  }

  try {
    const organization = await Organization.create({
      name: body.name,
      domain: body.domain,
    });

    const token = crypto.randomBytes(20).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await Invitation.create({
      email: body.initialAdmin.email,
      organizationId: new Types.ObjectId(organization._id),
      tokenHash,
      role: body.initialAdmin.role,
      expiresAt,
    });

    const origin = req.headers.get('origin') ?? process.env.APP_ORIGIN ?? '';
    if (origin) {
      const normalizedOrigin = origin.replace(/\/$/, '');
      const invitationLink = `${normalizedOrigin}/invite/${token}`;
      await sendInvitationEmail(body.initialAdmin.email, invitationLink);
    }

    return NextResponse.json(
      {
        organization: {
          id: organization._id.toString(),
          name: organization.name,
          domain: organization.domain,
        },
        invitation: {
          email: body.initialAdmin.email,
          role: body.initialAdmin.role,
          token,
          expiresAt: expiresAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (e: unknown) {
    const err = e as Error & { code?: number };
    if (err.code === 11000) {
      return problem(409, 'Conflict', 'An organization with this domain already exists.');
    }
    return problem(500, 'Internal Server Error', 'Failed to create organization.');
  }
}

export const runtime = 'nodejs';
