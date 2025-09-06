import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import path from 'node:path';
import fs from 'node:fs/promises';
import dbConnect from '@/lib/db';
import Attachment from '@/models/Attachment';
import Task from '@/models/Task';
import { canReadTask, canWriteTask } from '@/lib/access';
import { problem } from '@/lib/http';
import { withOrganization } from '@/lib/middleware/withOrganization';

export const GET = withOrganization(
  async (req: Request, { params }: { params: { id: string } }, session) => {
    await dbConnect();
    const task = await Task.findById(params.id);
    if (
      !task ||
      !canReadTask(
        { _id: session.userId, teamId: session.teamId, organizationId: session.organizationId },
        task
      )
    ) {
      return problem(404, 'Not Found', 'Task not found');
    }
    const attachments = await Attachment.find({ taskId: params.id }).sort({ createdAt: -1 });
    return NextResponse.json(attachments);
  }
);

export const POST = withOrganization(
  async (req: Request, { params }: { params: { id: string } }, session) => {
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return problem(400, 'Invalid request', 'File is required');
    }
    await dbConnect();
    const task = await Task.findById(params.id);
    if (
      !task ||
      !canWriteTask(
        { _id: session.userId, teamId: session.teamId, organizationId: session.organizationId },
        task
      )
    ) {
      return problem(404, 'Not Found', 'Task not found');
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    await fs.mkdir(uploadDir, { recursive: true });
    const filename = `${Date.now()}-${file.name}`;
    const filepath = path.join(uploadDir, filename);
    await fs.writeFile(filepath, buffer);
    const attachment = await Attachment.create({
      taskId: new Types.ObjectId(params.id),
      userId: new Types.ObjectId(session.userId),
      filename: file.name,
      url: `/uploads/${filename}`,
    });
    return NextResponse.json(attachment, { status: 201 });
  }
);

export const DELETE = withOrganization(
  async (req: Request, { params }: { params: { id: string } }, session) => {
    const url = new URL(req.url);
    const attachmentId = url.searchParams.get('id');
    if (!attachmentId) return problem(400, 'Invalid request', 'id is required');
    await dbConnect();
    const attachment = await Attachment.findById(attachmentId);
    if (!attachment || attachment.taskId.toString() !== params.id) {
      return problem(404, 'Not Found', 'Attachment not found');
    }
    const task = await Task.findById(params.id);
    if (
      !task ||
      !canWriteTask(
        { _id: session.userId, teamId: session.teamId, organizationId: session.organizationId },
        task
      )
    ) {
      return problem(403, 'Forbidden', 'You cannot delete this attachment');
    }
    try {
      const filePath = path.join(process.cwd(), 'public', attachment.url);
      await fs.unlink(filePath);
    } catch {}
    await Attachment.findByIdAndDelete(attachmentId);
    return NextResponse.json({ success: true });
  }
);
