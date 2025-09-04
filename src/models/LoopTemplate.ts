import { Schema, model, models, type Document, Types } from 'mongoose';

export interface ILoopStep {
  assignedTo: Types.ObjectId;
  description: string;
  estimatedTime?: number;
  dependencies?: number[];
}

export interface ILoopTemplate extends Document {
  name: string;
  steps: ILoopStep[];
  createdAt: Date;
  updatedAt: Date;
}

const loopStepSchema = new Schema<ILoopStep>(
  {
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    description: { type: String, required: true },
    estimatedTime: { type: Number },
    dependencies: [{ type: Number }],
  },
  { _id: false }
);

const loopTemplateSchema = new Schema<ILoopTemplate>(
  {
    name: { type: String, required: true },
    steps: [loopStepSchema],
  },
  { timestamps: true }
);

export default models.LoopTemplate || model<ILoopTemplate>('LoopTemplate', loopTemplateSchema);
