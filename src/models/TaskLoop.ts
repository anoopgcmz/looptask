import { Schema, model, models, type Document, Types } from 'mongoose';

export interface ILoopStep {
  taskId: Types.ObjectId;
  assignedTo: Types.ObjectId;
  description: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'DONE';
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
      enum: ['PENDING', 'IN_PROGRESS', 'DONE'],
      default: 'PENDING',
    },
    estimatedTime: { type: Number },
    actualTime: { type: Number },
    completedAt: Date,
    comments: String,
    dependencies: [{ type: Schema.Types.ObjectId }],
  },
  { _id: false }
);

const taskLoopSchema = new Schema<ITaskLoop>(
  {
    taskId: { type: Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
    sequence: [loopStepSchema],
    currentStep: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default models.TaskLoop || model<ITaskLoop>('TaskLoop', taskLoopSchema);
