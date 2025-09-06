import mongoose, { Types } from 'mongoose';
import dbConnect from '@/lib/db';
import Task from '@/models/Task';
import TaskLoop from '@/models/TaskLoop';
import LoopHistory from '@/models/LoopHistory';
import { notifyAssignment, notifyLoopStepReady } from '@/lib/notify';

export async function completeStep(
  taskId: string,
  stepIndex: number,
  userId?: string
) {
  await dbConnect();
  const sessionDb = await mongoose.startSession();
  let updatedLoop: any = null;
  let newlyActiveIndexes: number[] = [];
  try {
    await sessionDb.withTransaction(async () => {
      const loop = await TaskLoop.findOne({ taskId }).session(sessionDb);
      if (!loop) return;
      if (stepIndex < 0 || stepIndex >= loop.sequence.length) {
        updatedLoop = loop;
        return;
      }

      const step = loop.sequence[stepIndex];
      if (step.status === 'COMPLETED') {
        updatedLoop = loop;
        return;
      }

      step.status = 'COMPLETED';
      step.completedAt = new Date();

      const newActives: number[] = [];
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
          if (s.status !== 'ACTIVE') newActives.push(idx);
          s.status = 'ACTIVE';
          activated = activated || !loop.parallel;
        } else {
          s.status = 'PENDING';
        }
      });

      if (newActives.length) {
        loop.currentStep = Math.min(...newActives);
      } else {
        const activeIdx = loop.sequence.findIndex((s) => s.status === 'ACTIVE');
        loop.currentStep = activeIdx; // -1 if none
        if (activeIdx === -1 && loop.sequence.every((s) => s.status === 'COMPLETED')) {
          loop.isActive = false;
        }
      }

      await loop.save({ session: sessionDb });

      if (userId) {
        await LoopHistory.create(
          {
            taskId: loop.taskId,
            stepIndex,
            action: 'COMPLETE',
            userId: new Types.ObjectId(userId),
          },
          { session: sessionDb }
        );
      }

      newlyActiveIndexes = newActives;
      updatedLoop = loop;
    });
  } finally {
    await sessionDb.endSession();
  }

  if (!updatedLoop) return null;

  if (newlyActiveIndexes.length) {
    const task = await Task.findById(taskId).lean();
    if (task) {
      for (const idx of newlyActiveIndexes) {
        const s = updatedLoop.sequence[idx];
        const assignee = s.assignedTo as Types.ObjectId;
        await notifyAssignment([assignee], task, s.description);
        await notifyLoopStepReady([assignee], task, s.description);
      }
    }
  }

  return updatedLoop;
}

export default { completeStep };

