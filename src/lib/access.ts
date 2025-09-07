import type { Types } from 'mongoose';
import type { ITask } from '@/models/Task';

type UserLike = {
  _id: Types.ObjectId | string;
  organizationId?: Types.ObjectId | string | undefined;
  teamId?: Types.ObjectId | string | undefined;
};

export function canReadTask(user: UserLike, task: ITask): boolean {
  const userId = user?._id?.toString();
  const orgId = user.organizationId?.toString();
  if (!userId) return false;
  if (!orgId || task.organizationId.toString() !== orgId) return false;

  if (task.createdBy.toString() === userId) return true;
  if (task.ownerId?.toString() === userId) return true;
  if (task.helpers?.some((h) => h.toString() === userId)) return true;
  if (task.mentions?.some((m) => m.toString() === userId)) return true;

  if (
    task.visibility === 'TEAM' &&
    task.teamId &&
    user.teamId &&
    task.teamId.toString() === user.teamId.toString()
  ) {
    return true;
  }

  return false;
}

export function canWriteTask(user: UserLike, task: ITask): boolean {
  const userId = user?._id?.toString();
  const orgId = user.organizationId?.toString();
  if (!userId || !orgId || task.organizationId.toString() !== orgId) return false;
  return (
    task.createdBy.toString() === userId || task.ownerId?.toString() === userId
  );
}
