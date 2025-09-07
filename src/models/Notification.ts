import { Schema, model, models, type Document, type Types, type Model } from 'mongoose';

export interface INotification extends Document {
  userId: Types.ObjectId;
  type: string;
  message: string;
  taskId?: Types.ObjectId;
  read: boolean;
  readAt?: Date | null;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true },
    message: { type: String, required: true },
    taskId: { type: Schema.Types.ObjectId, ref: 'Task' },
    read: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

notificationSchema.index({ userId: 1, read: 1 });
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ type: 1 });

const NotificationModel =
  (models.Notification as Model<INotification>) ||
  model<INotification>('Notification', notificationSchema);

export default NotificationModel;
