import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
  Types,
} from 'mongoose';

export type TaskStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'IN_REVIEW'
  | 'REVISIONS'
  | 'FLOW_IN_PROGRESS'
  | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type TaskVisibility = 'PRIVATE' | 'TEAM';

export interface IStep {
  title: string;
  ownerId: Types.ObjectId;
  description?: string;
  dueAt?: Date;
  status: 'OPEN' | 'IN_PROGRESS' | 'DONE';
  completedAt?: Date;
}

export function deriveTaskStatusFromSteps(steps: IStep[]): TaskStatus {
  if (!steps.length) return 'OPEN';
  if (steps.every((step) => step.status === 'DONE')) return 'DONE';
  const hasProgress = steps.some((step) => step.status !== 'OPEN');
  return hasProgress ? 'IN_PROGRESS' : 'OPEN';
}

export function resolveCurrentStepIndex(steps: IStep[]): number {
  if (!steps.length) return 0;
  const next = steps.findIndex((step) => step.status !== 'DONE');
  if (next === -1) return steps.length - 1;
  return next;
}

const stepSchema = new Schema<IStep>(
  {
    title: { type: String, required: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    description: String,
    dueAt: Date,
    status: { type: String, enum: ['OPEN', 'IN_PROGRESS', 'DONE'], default: 'OPEN' },
    completedAt: Date,
  },
  { _id: false }
);

const taskSchema = new Schema(
  {
    title: { type: String, required: true },
    description: String,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User' },
    helpers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    mentions: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    teamId: { type: Schema.Types.ObjectId, ref: 'Team' },
    status: {
      type: String,
      enum: ['OPEN', 'IN_PROGRESS', 'IN_REVIEW', 'REVISIONS', 'FLOW_IN_PROGRESS', 'DONE'],
      default: 'OPEN',
    },
    priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'], default: 'LOW' },
    tags: [{ type: String }],
    visibility: { type: String, enum: ['PRIVATE', 'TEAM'], default: 'PRIVATE' },
    dueDate: Date,
    steps: [stepSchema],
    currentStepIndex: { type: Number, default: 0 },
    participantIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    custom: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

taskSchema.index({ organizationId: 1, status: 1, dueDate: 1 });
taskSchema.index({ ownerId: 1 });
taskSchema.index({ helpers: 1 });
taskSchema.index({ 'custom.$**': 1 });
taskSchema.index({ updatedAt: -1 });
taskSchema.index({ createdAt: -1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ createdBy: 1 });
taskSchema.index({ teamId: 1 });
taskSchema.index({ tags: 1 });
taskSchema.index({ visibility: 1 });
taskSchema.index({ projectId: 1 });
taskSchema.index({ title: 'text', description: 'text' });

taskSchema.pre('save', function (next) {
  const ids = new Set<string>();
  ids.add(this.createdBy.toString());
  if (this.ownerId) ids.add(this.ownerId.toString());
  this.helpers?.forEach((h) => ids.add(h.toString()));
  this.mentions?.forEach((m) => ids.add(m.toString()));
  this.steps?.forEach((s: IStep) => ids.add(s.ownerId.toString()));
  this.participantIds = Array.from(ids).map((id) => new Types.ObjectId(id));
  next();
});

export type ITask = InferSchemaType<typeof taskSchema>;

export const Task: Model<ITask> =
  (models.Task as Model<ITask>) ?? model<ITask>('Task', taskSchema);

