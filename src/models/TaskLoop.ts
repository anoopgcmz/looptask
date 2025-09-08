import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from 'mongoose';

const loopStepSchema = new Schema(
  {
    taskId: { type: Schema.Types.ObjectId, ref: 'Task', required: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    description: { type: String, required: true },
    status: {
      type: String,
      enum: ['PENDING', 'ACTIVE', 'COMPLETED', 'BLOCKED'],
      default: 'PENDING',
      get: (v: string): ILoopStep['status'] => {
        if (v === 'IN_PROGRESS') return 'ACTIVE';
        if (v === 'DONE') return 'COMPLETED';
        return v as ILoopStep['status'];
      },
      set: (v: string): ILoopStep['status'] => {
        if (v === 'IN_PROGRESS') return 'ACTIVE';
        if (v === 'DONE') return 'COMPLETED';
        return v as ILoopStep['status'];
      },
    },
    estimatedTime: { type: Number },
    actualTime: { type: Number },
    completedAt: Date,
    comments: String,
    dependencies: [{ type: Schema.Types.ObjectId }],
  },
  {
    _id: false,
    toObject: { getters: true },
    toJSON: { getters: true },
  }
);

const taskLoopSchema = new Schema(
  {
    taskId: { type: Schema.Types.ObjectId, ref: 'Task', required: true },
    sequence: [loopStepSchema],
    currentStep: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    parallel: { type: Boolean, default: false },
  },
  { timestamps: true }
);

taskLoopSchema.index({ taskId: 1 });
taskLoopSchema.index({ 'sequence.status': 1 });
taskLoopSchema.index({ 'sequence.description': 'text' });
taskLoopSchema.index({ createdAt: -1 });
taskLoopSchema.index({ updatedAt: -1 });

export type ILoopStep = InferSchemaType<typeof loopStepSchema>;
export type ITaskLoop = InferSchemaType<typeof taskLoopSchema>;

export const TaskLoop: Model<ITaskLoop> =
  (models.TaskLoop as Model<ITaskLoop>) ??
  model<ITaskLoop>('TaskLoop', taskLoopSchema);

