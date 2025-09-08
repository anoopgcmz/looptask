import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from 'mongoose';

const loopStepSchema = new Schema(
  {
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    description: { type: String, required: true },
    estimatedTime: { type: Number },
    dependencies: [{ type: Number }],
  },
  { _id: false }
);

const loopTemplateSchema = new Schema(
  {
    name: { type: String, required: true },
    steps: [loopStepSchema],
  },
  { timestamps: true }
);

export type ILoopStep = InferSchemaType<typeof loopStepSchema>;
export type ILoopTemplate = InferSchemaType<typeof loopTemplateSchema>;

export const LoopTemplate: Model<ILoopTemplate> =
  (models.LoopTemplate as Model<ILoopTemplate>) ??
  model<ILoopTemplate>('LoopTemplate', loopTemplateSchema);

