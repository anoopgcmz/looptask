import { Types } from 'mongoose';
import dbConnect from '@/lib/db';
import Task from '@/models/Task';
import TaskLoop from '@/models/TaskLoop';
import LoopHistory from '@/models/LoopHistory';
import { notifyFlowAdvanced } from '@/lib/notify';

export async function completeStep(
  taskId: string,
  stepIndex: number,
  userId?: string
) {
  await dbConnect();
  const loop = await TaskLoop.findOne({ taskId });
  if (!loop) return null;
  if (stepIndex < 0 || stepIndex >= loop.sequence.length) return loop;

  const step = loop.sequence[stepIndex];
  if (step.status === 'COMPLETED') return loop;

  step.status = 'COMPLETED';
  step.completedAt = new Date();

  const newlyActiveIndexes: number[] = [];
  let activated = false;
  loop.sequence.forEach((s, idx) => {
    if (s.status === 'COMPLETED') return;
    const deps = (s.dependencies as any[]) || [];
    const depsMet = deps.every((d) => {
      if (typeof d === 'number') {
        return loop.sequence[d]?.status === 'COMPLETED';
      }
      if (d instanceof Types.ObjectId) {
        const depIdx = loop.sequence.findIndex((st: any) => st._id && st._id.equals(d));
        return depIdx === -1 || loop.sequence[depIdx].status === 'COMPLETED';
      }
      return false;
    });
    if (!depsMet) {
      s.status = 'BLOCKED';
      return;
    }

    if (loop.parallel || !activated) {
      if (s.status !== 'ACTIVE') newlyActiveIndexes.push(idx);
      s.status = 'ACTIVE';
      activated = activated || !loop.parallel;
    } else {
      s.status = 'PENDING';
    }
  });

  if (newlyActiveIndexes.length) {
    loop.currentStep = Math.min(...newlyActiveIndexes);
  } else {
    const activeIdx = loop.sequence.findIndex((s) => s.status === 'ACTIVE');
    loop.currentStep = activeIdx; // -1 if none
    if (activeIdx === -1 && loop.sequence.every((s) => s.status === 'COMPLETED')) {
      loop.isActive = false;
    }
  }

  await loop.save();

  if (userId) {
    await LoopHistory.create({
      taskId: loop.taskId,
      stepIndex,
      action: 'COMPLETE',
      userId: new Types.ObjectId(userId),
    });
  }

  if (newlyActiveIndexes.length) {
    const task = await Task.findById(taskId);
    if (task) {
      const recipients = newlyActiveIndexes.map((idx) => loop.sequence[idx].assignedTo);
      const uniqueRecipients = Array.from(
        new Set(recipients.map((r) => r.toString()))
      ).map((id) => new Types.ObjectId(id));
      if (uniqueRecipients.length) {
        await notifyFlowAdvanced(uniqueRecipients, task);
      }
    }
  }

  return loop;
}

export default { completeStep };

