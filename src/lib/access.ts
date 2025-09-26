import type { Types } from 'mongoose';
import type { ITask } from '@/models/Task';
import { isPlatformRole, isTenantAdminRole } from '@/lib/roles';
import type { UserRole } from '@/lib/roles';

type UserLike = {
  _id: Types.ObjectId | string;
  organizationId?: Types.ObjectId | string | undefined;
  teamId?: Types.ObjectId | string | undefined;
  role?: UserRole | undefined;
};

export function canReadTask(user: UserLike, task: ITask): boolean {
  const userId = user?._id?.toString();
  const orgId = user.organizationId?.toString();
  if (!userId) return false;
  if (!isPlatformRole(user.role)) {
    if (!orgId || task.organizationId.toString() !== orgId) return false;
  }

  if (task.createdBy.toString() === userId) return true;
  if (task.ownerId?.toString() === userId) return true;
  if (task.helpers?.some((h) => h.toString() === userId)) return true;
  if (task.mentions?.some((m) => m.toString() === userId)) return true;
  if (task.participantIds?.some((p) => p.toString() === userId)) return true;

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
  if (!userId) return false;
  if (!isPlatformRole(user.role)) {
    if (!orgId || task.organizationId.toString() !== orgId) return false;
  }
  if (isPlatformRole(user.role) || isTenantAdminRole(user.role)) return true;
  return task.createdBy.toString() === userId;
}
