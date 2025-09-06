import { Schema, model, models, type Document, Types } from 'mongoose';

export interface ILoopStep {
  taskId: Types.ObjectId;
  assignedTo: Types.ObjectId;
  description: string;
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'BLOCKED';
  estimatedTime?: number;
  actualTime?: number;
  completedAt?: Date;
  comments?: string;
  dependencies?: Types.ObjectId[];
}

export interface ITaskLoop extends Document {
  taskId: Types.ObjectId;
  sequence: ILoopStep[];
  currentStep: number;
  isActive: boolean;
  parallel: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const loopStepSchema = new Schema<ILoopStep>(
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

const taskLoopSchema = new Schema<ITaskLoop>(
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

export default models.TaskLoop || model<ITaskLoop>('TaskLoop', taskLoopSchema);
