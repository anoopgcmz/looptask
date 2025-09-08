import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from 'mongoose';

const loopHistorySchema = new Schema(
  {
    taskId: { type: Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
    stepIndex: { type: Number, required: true },
    action: {
      type: String,
      enum: ['CREATE', 'UPDATE', 'COMPLETE', 'REASSIGN'],
      required: true,
    },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export type ILoopHistory = InferSchemaType<typeof loopHistorySchema>;

export const LoopHistory: Model<ILoopHistory> =
  (models.LoopHistory as Model<ILoopHistory>) ??
  model<ILoopHistory>('LoopHistory', loopHistorySchema);

