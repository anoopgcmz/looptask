import { Schema, model, models, type Document, Types } from 'mongoose';

export interface LoopStep {
  taskId: Types.ObjectId;
}

export interface ITaskLoop extends Document {
  taskId: Types.ObjectId;
  sequence: LoopStep[];
  currentStep: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const loopStepSchema = new Schema<LoopStep>(
  {
    taskId: { type: Schema.Types.ObjectId, ref: 'Task', required: true },
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
