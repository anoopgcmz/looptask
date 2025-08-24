import { Schema, model, models, type Document, type Types } from 'mongoose';

export interface INotification extends Document {
  userId: Types.ObjectId;
  message: string;
  read: boolean;
}

const notificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default models.Notification || model<INotification>('Notification', notificationSchema);
