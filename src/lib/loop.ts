import mongoose, { Types } from 'mongoose';
import dbConnect from '@/lib/db';
import { Task } from '@/models/Task';
import type { ITask } from '@/models/Task';
import { TaskLoop, type ILoopStep, type ITaskLoop } from '@/models/TaskLoop';
import { LoopHistory } from '@/models/LoopHistory';
import { notifyAssignment, notifyLoopStepReady } from '@/lib/notify';
import { emitLoopUpdated } from '@/lib/ws';

export function applyStepCompletion(loop: ITaskLoop, stepIndex: number) {
  if (stepIndex < 0 || stepIndex >= loop.sequence.length) {
    return { loop, newlyActiveIndexes: [] as number[], completed: false };
  }

  const step = loop.sequence[stepIndex];
  if (step.status === 'COMPLETED') {
    return { loop, newlyActiveIndexes: [] as number[], completed: false };
  }

  step.status = 'COMPLETED';
  step.completedAt = new Date();

  const newActives: number[] = [];
  let activated = false;
  loop.sequence.forEach((s: ILoopStep, idx) => {
    if (s.status === 'COMPLETED') return;
    const deps = (s.dependencies ?? []) as number[];
    const depsMet = deps.every((depIdx) => {
      if (depIdx < 0 || depIdx >= loop.sequence.length) return false;
      return loop.sequence[depIdx]?.status === 'COMPLETED';
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
    const activeIdx = loop.sequence.findIndex((s: ILoopStep) => s.status === 'ACTIVE');
    loop.currentStep = activeIdx;
    if (activeIdx === -1 && loop.sequence.every((s: ILoopStep) => s.status === 'COMPLETED')) {
      loop.isActive = false;
    }
  }

  return { loop, newlyActiveIndexes: newActives, completed: true };
}

export async function completeStep(
  taskId: string,
  stepIndex: number,
  userId?: string
) {
  await dbConnect();
  const sessionDb = await mongoose.startSession();
  let updatedLoop: ITaskLoop | null = null;
  let newlyActiveIndexes: number[] = [];
  let loopWasUpdated = false;
  try {
    await sessionDb.withTransaction(async () => {
      const loop = await TaskLoop.findOne({ taskId }).session(sessionDb);
      if (!loop) return;
      const result = applyStepCompletion(loop, stepIndex);

      if (!result.completed) {
        newlyActiveIndexes = result.newlyActiveIndexes;
        updatedLoop = loop;
        return;
      }

      await loop.save({ session: sessionDb });
      loopWasUpdated = true;

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

      newlyActiveIndexes = result.newlyActiveIndexes;
      updatedLoop = loop;
    });
  } finally {
    await sessionDb.endSession();
  }

  if (!updatedLoop) return null;

  if (loopWasUpdated) {
    const payload =
      typeof (updatedLoop as unknown as { toObject?: () => ITaskLoop }).toObject === 'function'
        ? ((updatedLoop as unknown as { toObject: () => ITaskLoop }).toObject() as ITaskLoop)
        : updatedLoop;
    emitLoopUpdated({ taskId, patch: payload, updatedAt: updatedLoop.updatedAt });
  }

  if (newlyActiveIndexes.length) {
    const task = await Task.findById(taskId).lean<Pick<ITask, '_id' | 'title' | 'status'>>();
    if (task) {
      const sequence = updatedLoop.sequence as ILoopStep[];
      for (const idx of newlyActiveIndexes) {
        const s = sequence[idx];
        const assignee = s.assignedTo as Types.ObjectId;
        await notifyAssignment([assignee], task, s.description);
        await notifyLoopStepReady([assignee], task, s.description);
      }
    }
  }

  return updatedLoop;
}

const loopUtils = { completeStep };
export default loopUtils;

