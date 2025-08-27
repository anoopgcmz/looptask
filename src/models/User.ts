import { Schema, model, models, type Document, type Types } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  organizationId: Types.ObjectId;
  teamId?: Types.ObjectId;
  timezone: string;
  isActive: boolean;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    teamId: { type: Schema.Types.ObjectId, ref: 'Team' },
    timezone: { type: String, default: 'Asia/Kolkata' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default models.User || model<IUser>('User', userSchema);
