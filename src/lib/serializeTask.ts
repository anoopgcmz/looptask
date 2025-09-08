import type { ITask } from '@/models/Task';
import type { TaskResponse } from '@/types/api/task';
import { Types } from 'mongoose';

export function serializeTask(task: ITask): TaskResponse {
    return {
      _id: (task._id as Types.ObjectId).toString(),
    title: task.title,
    description: task.description,
    createdBy: task.createdBy.toString(),
    ownerId: task.ownerId?.toString(),
    helpers: task.helpers?.map((id) => id.toString()),
    mentions: task.mentions?.map((id) => id.toString()),
    organizationId: task.organizationId.toString(),
    teamId: task.teamId?.toString(),
    status: task.status,
    priority: task.priority,
    tags: task.tags,
    visibility: task.visibility ?? 'PRIVATE',
    dueDate: task.dueDate?.toISOString(),
    steps: task.steps?.map((s) => ({
      title: s.title,
      ownerId: s.ownerId.toString(),
      description: s.description,
      dueAt: s.dueAt?.toISOString(),
      status: s.status,
      completedAt: s.completedAt?.toISOString(),
    })),
    currentStepIndex: task.currentStepIndex,
    participantIds: task.participantIds?.map((id) => id.toString()),
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

