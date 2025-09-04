import { Schema, model, models, type Document, type Types } from 'mongoose';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

export interface IUser extends Document {
  name: string;
  email: string;
  username: string;
  password: string;
  organizationId: Types.ObjectId;
  teamId?: Types.ObjectId;
  timezone: string;
  isActive: boolean;
  role: 'ADMIN' | 'USER';
  avatar?: string;
  permissions: string[];
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: {
      type: String,
      required: true,
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
    role: { type: String, enum: ['ADMIN', 'USER'], default: 'USER' },
    avatar: { type: String },
    permissions: { type: [String], default: [] },
  },
  { timestamps: true }
);

userSchema.index({ email: 1, organizationId: 1 }, { unique: true });

userSchema.pre('save', async function () {
  if (this.isModified('password')) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    (this as any).password = await bcrypt.hash(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      (this as any).password,
      SALT_ROUNDS
    );
  }
});

export default models.User || model<IUser>('User', userSchema);
