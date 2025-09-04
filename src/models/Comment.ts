import { Schema, model, models, type Document, type Types } from 'mongoose';

export interface IComment extends Document {
  taskId: Types.ObjectId;
  userId: Types.ObjectId;
  content: string;
}

const commentSchema = new Schema<IComment>(
  {
    taskId: { type: Schema.Types.ObjectId, ref: 'Task', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
  },
  { timestamps: true }
);

commentSchema.index({ taskId: 1, createdAt: -1 });

export default models.Comment || model<IComment>('Comment', commentSchema);
