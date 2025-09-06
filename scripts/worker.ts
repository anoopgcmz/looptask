import agenda, { initAgenda, DEFAULT_TZ } from '@/lib/agenda';
import User from '@/models/User';
import Team from '@/models/Team';
import Task from '@/models/Task';
import { notifyDueSoon, notifyDueNow, notifyOverdue } from '@/lib/notify';
import { Types } from 'mongoose';
import type { Job } from 'agenda';

agenda.define('task.dueSoon', async (job: Job) => {
  const { taskId, stepId } = job.attrs.data as { taskId: string; stepId?: string };
  const task = await Task.findById(taskId).lean();
  if (!task) return;
  let recipients: Types.ObjectId[] = [];
  if (stepId) {
    const idx = parseInt(stepId.split(':')[1] || '0', 10);
    const step = task.steps?.[idx];
    if (step?.ownerId) recipients = [step.ownerId];
  } else {
    recipients = (task.participantIds || []) as Types.ObjectId[];
  }
  if (recipients.length) await notifyDueSoon(recipients, task);
});

agenda.define('task.dueNow', async (job: Job) => {
  const { taskId, stepId } = job.attrs.data as { taskId: string; stepId?: string };
  const task = await Task.findById(taskId).lean();
  if (!task) return;
  let recipients: Types.ObjectId[] = [];
  if (stepId) {
    const idx = parseInt(stepId.split(':')[1] || '0', 10);
    const step = task.steps?.[idx];
    if (step?.ownerId) recipients = [step.ownerId];
  } else {
    recipients = (task.participantIds || []) as Types.ObjectId[];
  }
  if (recipients.length) {
    await notifyDueNow(recipients, task);
    await notifyOverdue(recipients, task);
  }
});

agenda.define('task.overdueDigest', async (job: Job) => {
  console.log('task.overdueDigest', job.attrs.data);
});

agenda.define('dashboard.dailySnapshot', async (job: Job) => {
  console.log('dashboard.dailySnapshot', job.attrs.data);
});

(async () => {
  await initAgenda();
  await agenda.start();
  const users = await User.find({ isActive: true });
  for (const user of users) {
    await agenda.every(
      '0 9 * * *',
      'task.overdueDigest',
      { userId: user._id.toString() },
      {
        timezone: user.timezone || DEFAULT_TZ,
        unique: { name: 'task.overdueDigest', 'data.userId': user._id.toString() },
        skipImmediate: true,
      }
    );
  }
  const teams = await Team.find({});
  for (const team of teams) {
    const tz = (team as any).timezone || DEFAULT_TZ;
    await agenda.every(
      '0 18 * * *',
      'dashboard.dailySnapshot',
      { teamId: team._id.toString() },
      {
        timezone: tz,
        unique: { name: 'dashboard.dailySnapshot', 'data.teamId': team._id.toString() },
        skipImmediate: true,
      }
    );
  }
  console.log('Worker started');
})();
