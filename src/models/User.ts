import { Schema, model, models, type Document, type Types } from 'mongoose';
import { createHash } from 'crypto';

export interface IUser extends Document {
  name: string;
  email: string;
  username: string;
  password: string;
  organizationId: Types.ObjectId;
  teamId?: Types.ObjectId;
  timezone: string;
  isActive: boolean;
  isAdmin: boolean;
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
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },
    password: { type: String, required: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    teamId: { type: Schema.Types.ObjectId, ref: 'Team' },
    timezone: { type: String, default: 'Asia/Kolkata' },
    isActive: { type: Boolean, default: true },
    isAdmin: { type: Boolean, default: false },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    (this as any).password = createHash('sha256').update((this as any).password).digest('hex');
  }
  next();
});

export default models.User || model<IUser>('User', userSchema);
