import { Types } from 'mongoose';
import { Resend } from 'resend';
import Notification from '@/models/Notification';
import User from '@/models/User';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

async function createAndEmail(
  userIds: Types.ObjectId[],
  type: string,
  entityRef: any,
  subject: string,
  text: string
) {
  if (!userIds.length) return;
  await Notification.insertMany(userIds.map((userId) => ({ userId, type, entityRef })));
  if (resend) {
    const users = await User.find({ _id: { $in: userIds } });
    await Promise.all(
      users.map((u) =>
        resend.emails.send({
          from: 'notify@example.com',
          to: u.email,
          subject,
          text,
        })
      )
    );
  }
}

export async function notifyAssignment(userIds: Types.ObjectId[], task: any) {
  await createAndEmail(
    userIds,
    'ASSIGNMENT',
    { taskId: task._id },
    `Task assigned: ${task.title}`,
    `You have been assigned to task "${task.title}".`
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

export async function notifyFlowAdvanced(userIds: Types.ObjectId[], task: any) {
  await createAndEmail(
    userIds,
    'FLOW_ADVANCED',
    { taskId: task._id },
    'Task flow advanced',
    `Task "${task.title}" advanced to the next step.`
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

