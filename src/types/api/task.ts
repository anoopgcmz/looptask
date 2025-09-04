import type { TaskPriority, TaskStatus, TaskVisibility } from '@/models/Task';

export interface TaskStepPayload {
  title: string;
  ownerId: string;
  description?: string;
  dueAt?: string;
  status?: 'OPEN' | 'DONE';
  completedAt?: string;
}

export interface TaskPayload {
  title: string;
  description?: string;
  ownerId?: string;
  helpers?: string[];
  mentions?: string[];
  teamId?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  tags?: string[];
  visibility?: TaskVisibility;
  dueDate?: string;
  steps?: TaskStepPayload[];
  currentStepIndex?: number;
}

export interface TaskListQuery {
  ownerId?: string;
  createdBy?: string;
  status?: TaskStatus[];
  dueFrom?: string;
  dueTo?: string;
  priority?: TaskPriority[];
  tag?: string[];
  visibility?: TaskVisibility;
  teamId?: string;
  q?: string;
  sort?: 'dueDate' | 'priority' | 'createdAt' | 'title';
  limit?: number;
  page?: number;
}

export interface TaskStep {
  title: string;
  ownerId: string;
  description?: string;
  dueAt?: string;
  status: 'OPEN' | 'DONE';
  completedAt?: string;
}

export interface TaskResponse {
  _id: string;
  title: string;
  description?: string;
  createdBy: string;
  ownerId?: string;
  helpers?: string[];
  mentions?: string[];
  organizationId: string;
  teamId?: string;
  status: TaskStatus;
  priority: TaskPriority;
  tags?: string[];
  visibility: TaskVisibility;
  dueDate?: string;
  steps?: TaskStep[];
  currentStepIndex?: number;
  participantIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export type { TaskStatus, TaskPriority, TaskVisibility };
