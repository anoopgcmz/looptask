import Agenda from 'agenda';
import dbConnect from './db';

export const DEFAULT_TZ = 'Asia/Kolkata';

const agenda = new Agenda({});

let connected: Promise<Agenda> | null = null;
export async function initAgenda(): Promise<Agenda> {
  if (!connected) {
    connected = (async () => {
      const mongoose = await dbConnect();
      agenda.mongo(mongoose.connection.db, 'agendaJobs');
      return agenda;
    })();
  }
  return connected;
}

export async function scheduleTaskJobs(task: any) {
  const ag = await initAgenda();
  const taskId = task._id.toString();
  await ag.cancel({ name: { $in: ['task.dueSoon', 'task.dueNow'] }, 'data.taskId': taskId });
  if (task.dueAt) {
    const due = new Date(task.dueAt);
    const soon = new Date(due.getTime() - 24 * 60 * 60 * 1000);
    if (soon > new Date()) {
      await ag.schedule(soon, 'task.dueSoon', { taskId });
    }
    await ag.schedule(due, 'task.dueNow', { taskId });
  }
  if (task.steps && Array.isArray(task.steps)) {
    for (let i = 0; i < task.steps.length; i++) {
      const step = task.steps[i];
      if (!step?.dueAt) continue;
      const stepId = `${taskId}:${i}`;
      await ag.cancel({ name: { $in: ['task.dueSoon', 'task.dueNow'] }, 'data.stepId': stepId });
      const due = new Date(step.dueAt);
      const soon = new Date(due.getTime() - 24 * 60 * 60 * 1000);
      const data = { taskId, stepId };
      if (soon > new Date()) {
        await ag.schedule(soon, 'task.dueSoon', data);
      }
      await ag.schedule(due, 'task.dueNow', data);
    }
  }
}

export default agenda;
