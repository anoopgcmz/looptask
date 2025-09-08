import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from 'mongoose';

const notificationSchema = new Schema(
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

export type INotification = InferSchemaType<typeof notificationSchema>;

export const Notification: Model<INotification> = NotificationModel;

