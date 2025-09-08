import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from 'mongoose';

const commentSchema = new Schema(
  {
    taskId: { type: Schema.Types.ObjectId, ref: 'Task', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    parentId: { type: Schema.Types.ObjectId, ref: 'Comment', default: null },
  },
  { timestamps: true }
);

commentSchema.index({ taskId: 1, parentId: 1, createdAt: -1 });
commentSchema.index({ updatedAt: -1 });
commentSchema.index({ userId: 1 });
commentSchema.index({ content: 'text' });

export type IComment = InferSchemaType<typeof commentSchema>;

export const Comment: Model<IComment> =
  (models.Comment as Model<IComment>) ??
  model<IComment>('Comment', commentSchema);

