import type { TaskPriority, TaskStatus, TaskVisibility } from '@/models/Task';

export interface TaskStepPayload {
  title: string;
  ownerId: string;
  description?: string | undefined;
  dueAt?: Date | undefined;
  status?: 'OPEN' | 'DONE' | undefined;
  completedAt?: Date | undefined;
}

export interface TaskPayload {
  title: string;
  description?: string | undefined;
  ownerId?: string | undefined;
  helpers?: string[] | undefined;
  mentions?: string[] | undefined;
  teamId?: string | undefined;
  status?: TaskStatus | undefined;
  priority?: TaskPriority | undefined;
  tags?: string[] | undefined;
  visibility?: TaskVisibility | undefined;
  dueDate?: Date | undefined;
  steps?: TaskStepPayload[] | undefined;
  currentStepIndex?: number | undefined;
}

export interface TaskListQuery {
  ownerId?: string | undefined;
  createdBy?: string | undefined;
  status?: TaskStatus[] | undefined;
  dueFrom?: Date | undefined;
  dueTo?: Date | undefined;
  priority?: TaskPriority[] | undefined;
  tag?: string[] | undefined;
  visibility?: TaskVisibility | undefined;
  teamId?: string | undefined;
  q?: string | undefined;
  sort?: 'dueDate' | 'priority' | 'createdAt' | 'title' | undefined;
  limit?: number | undefined;
  page?: number | undefined;
}

export interface TaskStep {
  title: string;
  ownerId: string;
  description?: string | undefined;
  dueAt?: string | undefined;
  status: 'OPEN' | 'DONE';
  completedAt?: string | undefined;
}

export interface TaskResponse {
  _id: string;
  title: string;
  description?: string | undefined;
  createdBy: string;
  ownerId?: string | undefined;
  helpers?: string[] | undefined;
  mentions?: string[] | undefined;
  organizationId: string;
  teamId?: string | undefined;
  status: TaskStatus;
  priority: TaskPriority;
  tags?: string[] | undefined;
  visibility: TaskVisibility;
  dueDate?: string | undefined;
  steps?: TaskStep[] | undefined;
  currentStepIndex?: number | undefined;
  participantIds?: string[] | undefined;
  createdAt: string;
  updatedAt: string;
}

export type { TaskStatus, TaskPriority, TaskVisibility };
