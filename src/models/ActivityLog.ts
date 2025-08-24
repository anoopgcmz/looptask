import { Schema, model, models, type Document, type Types } from 'mongoose';

export interface IActivityLog extends Document {
  userId?: Types.ObjectId;
  action: string;
  meta?: Record<string, unknown>;
}

const activityLogSchema = new Schema<IActivityLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, required: true },
    meta: Schema.Types.Mixed,
  },
  { timestamps: true }
);

export default models.ActivityLog || model<IActivityLog>('ActivityLog', activityLogSchema);
