import { Types } from 'mongoose';
import { Resend } from 'resend';
import Notification from '@/models/Notification';
import User from '@/models/User';
import dbConnect from '@/lib/db';
import RateLimit from '@/models/RateLimit';
import { emitNotification } from '@/lib/ws';
import path from 'path';
import { promises as fs } from 'fs';
import { sendPushToUser } from '@/lib/push';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const THROTTLE_SECONDS = 60;

const templateMap: Record<string, string> = {
  ASSIGNMENT: 'task-assigned.html',
  FLOW_ADVANCED: 'loop-step-ready.html',
  TASK_CLOSED: 'task-completed.html',
  OVERDUE: 'overdue-alert.html',
};

async function renderTemplate(
  type: string,
  vars: Record<string, string>
): Promise<string | null> {
  const file = templateMap[type];
  if (!file) return null;
  try {
    const fullPath = path.join(process.cwd(), 'src', 'emails', file);
    let html = await fs.readFile(fullPath, 'utf8');
    Object.entries(vars).forEach(([k, v]) => {
      html = html.replace(new RegExp(`{{\\s*${k}\\s*}}`, 'g'), v);
    });
    return html;
  } catch {
    return null;
  }
}

async function shouldSend(key: string): Promise<boolean> {
  await dbConnect();
  const now = new Date();
  const record = await RateLimit.findOne({ key });
  if (record && record.windowEndsAt > now) return false;
  const windowEndsAt = new Date(now.getTime() + THROTTLE_SECONDS * 1000);
  await RateLimit.updateOne({ key }, { count: 1, windowEndsAt }, { upsert: true });
  return true;
}

async function createAndEmail(
  userIds: Types.ObjectId[],
  type: string,
  entityRef: any,
  subject: string,
  text: string
) {
  if (!userIds.length) return;
  const recipients: Types.ObjectId[] = [];
  for (const userId of userIds) {
    const key = `notify:${userId.toString()}:${type}:${entityRef.taskId?.toString() || ''}:${
      entityRef.step || ''
    }`;
    if (await shouldSend(key)) {
      recipients.push(userId);
    }
  }
  if (!recipients.length) return;
  const notifications = await Notification.insertMany(
    recipients.map((userId) => ({ userId, type, entityRef }))
  );
  notifications.forEach((n) =>
    emitNotification(n.toObject(), n.userId.toString())
  );
  const users = await User.find({ _id: { $in: recipients } });
  const pushUsers = users.filter((u) => {
    const settings = u.notificationSettings;
    if (!settings || settings.push === false) return false;
    const perType = settings.types?.[type];
    return perType !== false;
  });
  const pushPayload = { title: subject, body: text, type };
  await Promise.all(pushUsers.map((u) => sendPushToUser(u, pushPayload)));
  if (resend) {
    const html = await renderTemplate(type, { subject, text });
    const emailUsers = users.filter((u) => {
      const settings = u.notificationSettings;
      if (!settings || settings.email === false) return false;
      const perType = settings.types?.[type];
      return perType !== false;
    });
    await Promise.all(
      emailUsers.map((u) =>
        resend.emails.send({
          from: 'notify@example.com',
          to: u.email,
          subject,
          html: html || undefined,
          text,
        })
      )
    );
  }
}

export async function notifyAssignment(
  userIds: Types.ObjectId[],
  task: any,
  step?: string
) {
  const stepText = step ? `step "${step}" of ` : '';
  await createAndEmail(
    userIds,
    'ASSIGNMENT',
    { taskId: task._id, step },
    `Task assigned: ${task.title}`,
    `You have been assigned to ${stepText}task "${task.title}" (#${task._id}).`
  );
}

export async function notifyMention(
  userIds: Types.ObjectId[],
  taskId: Types.ObjectId,
  commentId?: Types.ObjectId
) {
  await createAndEmail(
    userIds,
    'COMMENT_MENTION',
    { taskId, commentId },
    'You were mentioned',
    'You were mentioned in a comment.'
  );
}

export async function notifyStatusChange(userIds: Types.ObjectId[], task: any) {
  await createAndEmail(
    userIds,
    'STATUS_CHANGE',
    { taskId: task._id, status: task.status },
    'Task status updated',
    `Task "${task.title}" is now ${task.status}.`
  );
}

export async function notifyDueSoon(userIds: Types.ObjectId[], task: any) {
  await createAndEmail(
    userIds,
    'DUE_SOON',
    { taskId: task._id },
    'Task due soon',
    `Task "${task.title}" is due soon.`
  );
}

export async function notifyDueNow(userIds: Types.ObjectId[], task: any) {
  await createAndEmail(
    userIds,
    'DUE_NOW',
    { taskId: task._id },
    'Task due now',
    `Task "${task.title}" is due now.`
  );
}

export async function notifyOverdue(userIds: Types.ObjectId[], task: any) {
  await createAndEmail(
    userIds,
    'OVERDUE',
    { taskId: task._id },
    'Task overdue',
    `Task "${task.title}" is overdue.`
  );
}

export async function notifyFlowAdvanced(
  userIds: Types.ObjectId[],
  task: any,
  step?: string
) {
  await createAndEmail(
    userIds,
    'FLOW_ADVANCED',
    { taskId: task._id, step },
    `Task flow advanced: ${task.title}`,
    `Task "${task.title}" (#${task._id}) advanced to ${step ? `step "${step}"` : 'the next step'}.`
  );
}

export async function notifyTaskClosed(userIds: Types.ObjectId[], task: any) {
  await createAndEmail(
    userIds,
    'TASK_CLOSED',
    { taskId: task._id },
    'Task closed',
    `Task "${task.title}" has been completed.`
  );
}

