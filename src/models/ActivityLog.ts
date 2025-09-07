import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
  type Types,
} from 'mongoose';

const activityLogSchema = new Schema(
  {
    taskId: { type: Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
    actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true },
    payload: Schema.Types.Mixed,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export type IActivityLog = InferSchemaType<typeof activityLogSchema>;

export const ActivityLog: Model<IActivityLog> =
  (models.ActivityLog as Model<IActivityLog>) ??
  model<IActivityLog>('ActivityLog', activityLogSchema);

