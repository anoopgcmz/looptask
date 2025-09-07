import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
  Types,
} from 'mongoose';

const attachmentSchema = new Schema(
  {
    taskId: { type: Schema.Types.ObjectId, ref: 'Task', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    filename: { type: String, required: true },
    url: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

attachmentSchema.index({ taskId: 1, createdAt: -1 });

export type IAttachment = InferSchemaType<typeof attachmentSchema>;

export const Attachment: Model<IAttachment> =
  (models.Attachment as Model<IAttachment>) ??
  model<IAttachment>('Attachment', attachmentSchema);

