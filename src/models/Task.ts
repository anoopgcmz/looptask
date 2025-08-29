import { Schema, model, models, type Document, Types } from 'mongoose';

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
  status: 'OPEN' | 'DONE';
  completedAt?: Date;
}

export interface ITask extends Document {
  title: string;
  description?: string;
  creatorId: Types.ObjectId;
  ownerId: Types.ObjectId;
  helpers: Types.ObjectId[];
  mentions: Types.ObjectId[];
  organizationId: Types.ObjectId;
  teamId?: Types.ObjectId;
  status: TaskStatus;
  priority: TaskPriority;
  tags: string[];
  visibility: TaskVisibility;
  dueAt?: Date;
  steps: IStep[];
  currentStepIndex: number;
  participantIds: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const stepSchema = new Schema<IStep>(
  {
    title: { type: String, required: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    description: String,
    dueAt: Date,
    status: { type: String, enum: ['OPEN', 'DONE'], default: 'OPEN' },
    completedAt: Date,
  },
  { _id: false }
);

const taskSchema = new Schema<ITask>(
  {
    title: { type: String, required: true },
    description: String,
    creatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    helpers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    mentions: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    teamId: { type: Schema.Types.ObjectId, ref: 'Team' },
    status: {
      type: String,
      enum: ['OPEN', 'IN_PROGRESS', 'IN_REVIEW', 'REVISIONS', 'FLOW_IN_PROGRESS', 'DONE'],
      default: 'OPEN',
    },
    priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'], default: 'MEDIUM' },
    tags: [{ type: String }],
    visibility: { type: String, enum: ['PRIVATE', 'TEAM'], default: 'PRIVATE' },
    dueAt: Date,
    steps: [stepSchema],
    currentStepIndex: { type: Number, default: 0 },
    participantIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

taskSchema.index({ ownerId: 1, status: 1, dueAt: 1 });
taskSchema.index({ creatorId: 1, status: 1 });
taskSchema.index({ teamId: 1, visibility: 1 });
taskSchema.index({ organizationId: 1 });
taskSchema.index({ updatedAt: -1 });
taskSchema.index({ title: 'text', description: 'text' });

taskSchema.pre('save', function (next) {
  const ids = new Set<string>();
  ids.add(this.creatorId.toString());
  ids.add(this.ownerId.toString());
  this.helpers?.forEach((h) => ids.add(h.toString()));
  this.mentions?.forEach((m) => ids.add(m.toString()));
  this.steps?.forEach((s) => ids.add(s.ownerId.toString()));
  this.participantIds = Array.from(ids).map((id) => new Types.ObjectId(id));
  next();
});

export default models.Task || model<ITask>('Task', taskSchema);
