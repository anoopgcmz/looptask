import { Schema, model, models, type Document, type Types } from 'mongoose';

export interface IComment extends Document {
  taskId: Types.ObjectId;
  userId: Types.ObjectId;
  content: string;
  parentId?: Types.ObjectId;
}

const commentSchema = new Schema<IComment>(
  {
    taskId: { type: Schema.Types.ObjectId, ref: 'Task', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    parentId: { type: Schema.Types.ObjectId, ref: 'Comment', default: null },
  },
  { timestamps: true }
);

commentSchema.index({ taskId: 1, parentId: 1, createdAt: -1 });
commentSchema.index({ content: 'text' });

export default models.Comment || model<IComment>('Comment', commentSchema);
