import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import dbConnect from '@/lib/db';
import LoopTemplate from '@/models/LoopTemplate';
import { problem } from '@/lib/http';

const stepSchema = z.object({
  assignedTo: z.string(),
  description: z.string(),
  estimatedTime: z.number().optional(),
  dependencies: z.array(z.number()).optional(),
});

const templateSchema = z.object({
  name: z.string(),
  steps: z.array(stepSchema),
});

export async function GET() {
  await dbConnect();
  const templates = await LoopTemplate.find();
  return NextResponse.json(templates);
}

export async function POST(req: NextRequest) {
  let body: z.infer<typeof templateSchema>;
  try {
    body = templateSchema.parse(await req.json());
  } catch (e: any) {
    return problem(400, 'Invalid request', e.message);
  }
  await dbConnect();
  const template = await LoopTemplate.create(body);
  return NextResponse.json(template, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const schema = templateSchema.extend({ id: z.string() });
  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await req.json());
  } catch (e: any) {
    return problem(400, 'Invalid request', e.message);
  }
  await dbConnect();
  const template = await LoopTemplate.findByIdAndUpdate(
    body.id,
    { name: body.name, steps: body.steps },
    { new: true }
  );
  if (!template) {
    return problem(404, 'Not Found', 'Template not found');
  }
  return NextResponse.json(template);
}

export async function DELETE(req: NextRequest) {
  const schema = z.object({ id: z.string() });
  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await req.json());
  } catch (e: any) {
    return problem(400, 'Invalid request', e.message);
  }
  await dbConnect();
  const deleted = await LoopTemplate.findByIdAndDelete(body.id);
  if (!deleted) {
    return problem(404, 'Not Found', 'Template not found');
  }
  return NextResponse.json({ success: true });
}
