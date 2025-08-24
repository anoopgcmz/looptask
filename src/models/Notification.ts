import { Schema, model, models, type Document, type Types } from 'mongoose';

export interface INotification extends Document {
  userId: Types.ObjectId;
  type: string;
  entityRef: unknown;
  deliveredAt?: Date;
  readAt?: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, required: true },
    entityRef: Schema.Types.Mixed,
    deliveredAt: Date,
    readAt: Date,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default models.Notification || model<INotification>('Notification', notificationSchema);
