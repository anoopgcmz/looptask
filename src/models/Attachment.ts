import { Schema, model, models, type Document, Types } from 'mongoose';

export interface IAttachment extends Document {
  taskId: Types.ObjectId;
  userId: Types.ObjectId;
  filename: string;
  url: string;
  createdAt: Date;
}

const attachmentSchema = new Schema<IAttachment>(
  {
    taskId: { type: Schema.Types.ObjectId, ref: 'Task', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    filename: { type: String, required: true },
    url: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

attachmentSchema.index({ taskId: 1, createdAt: -1 });

export default models.Attachment || model<IAttachment>('Attachment', attachmentSchema);
