import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withOrganization } from '@/lib/middleware/withOrganization';
import { problem } from '@/lib/http';

export const runtime = 'nodejs';

const analyticsSchema = z.object({
  draftId: z.string().trim().min(1),
  edited: z.boolean(),
  success: z.boolean().optional(),
});

export const POST = withOrganization(async (req, session) => {
  let body: z.infer<typeof analyticsSchema>;
  try {
    body = analyticsSchema.parse(await req.json());
  } catch (error: unknown) {
    const err = error as Error;
    return problem(400, 'Invalid request', err.message);
  }

  console.info('ai.task-intake.analytics', {
    organizationId: session.organizationId,
    userId: session.userId,
    draftId: body.draftId,
    edited: body.edited,
    success: body.success !== false,
    recordedAt: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true });
});

