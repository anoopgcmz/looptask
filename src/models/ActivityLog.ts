import { Schema, model, models, type Document, type Types } from 'mongoose';

export interface IActivityLog extends Document {
  taskId: Types.ObjectId;
  actorId: Types.ObjectId;
  type: string;
  payload: unknown;
  createdAt: Date;
}

const activityLogSchema = new Schema<IActivityLog>(
  {
    taskId: { type: Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
    actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true },
    payload: Schema.Types.Mixed,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default models.ActivityLog || model<IActivityLog>('ActivityLog', activityLogSchema);
