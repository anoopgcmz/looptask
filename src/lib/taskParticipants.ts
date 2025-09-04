import { Types } from 'mongoose';
import type { IStep } from '@/models/Task';

export type IdLike = Types.ObjectId | string;

export interface TaskParticipantsPayload {
  createdBy: IdLike;
  ownerId?: IdLike;
  helpers?: IdLike[];
  mentions?: IdLike[];
  steps?: (Pick<IStep, 'ownerId'> & { ownerId: IdLike })[];
}

export function computeParticipants(data: TaskParticipantsPayload): Types.ObjectId[] {
  const ids = new Set<string>();
  ids.add(data.createdBy.toString());
  if (data.ownerId) ids.add(data.ownerId.toString());
  data.helpers?.forEach((h) => ids.add(h.toString()));
  data.mentions?.forEach((m) => ids.add(m.toString()));
  data.steps?.forEach((s) => ids.add(s.ownerId.toString()));
  return Array.from(ids).map((id) => new Types.ObjectId(id));
}
