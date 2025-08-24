import { Schema, model, models, type Document, type Types } from 'mongoose';

export interface IComment extends Document {
  taskId: Types.ObjectId;
  authorId: Types.ObjectId;
  body: string;
  mentions: Types.ObjectId[];
  attachments: string[];
}

const commentSchema = new Schema<IComment>(
  {
    taskId: { type: Schema.Types.ObjectId, ref: 'Task', required: true },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true },
    mentions: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    attachments: [String],
  },
  { timestamps: true }
);

export default models.Comment || model<IComment>('Comment', commentSchema);
