import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type HydratedDocument,
  type Model,
  type Types,
} from 'mongoose';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

const userSchema = new Schema(
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
    notificationSettings: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      digestFrequency: {
        type: String,
        enum: ['immediate', 'daily', 'weekly'],
        default: 'immediate',
      },
      lastDigestAt: { type: Date },
      types: {
        ASSIGNMENT: { type: Boolean, default: true },
        LOOP_STEP_READY: { type: Boolean, default: true },
        TASK_CLOSED: { type: Boolean, default: true },
        OVERDUE: { type: Boolean, default: true },
      },
    },
    pushSubscriptions: {
      type: [
        {
          endpoint: { type: String, required: true },
          keys: {
            p256dh: { type: String, required: true },
            auth: { type: String, required: true },
          },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

userSchema.index({ email: 1, organizationId: 1 }, { unique: true });

export type IUser = InferSchemaType<typeof userSchema>;
export type UserDocument = HydratedDocument<IUser>;

userSchema.pre('save', async function (this: UserDocument) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
  }
});

export const User: Model<IUser> =
  (models.User as Model<IUser>) ?? model<IUser>('User', userSchema);

