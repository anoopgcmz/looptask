import { Schema, model, models, type Document, type Types } from 'mongoose';

export interface IComment extends Document {
  taskId: Types.ObjectId;
  authorId: Types.ObjectId;
  content: string;
}

const commentSchema = new Schema<IComment>(
  {
    taskId: { type: Schema.Types.ObjectId, ref: 'Task', required: true },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
  },
  { timestamps: true }
);

export default models.Comment || model<IComment>('Comment', commentSchema);
