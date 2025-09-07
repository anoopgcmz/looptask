import {
  Schema,
  model,
  models,
  type HydratedDocument,
  type Types,
  type Model,
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

export interface IUser {
  name: string;
  email: string;
  username: string;
  password: string;
  organizationId: Types.ObjectId;
  teamId?: Types.ObjectId | undefined;
  timezone: string;
  isActive: boolean;
  role: 'ADMIN' | 'USER';
  avatar?: string | undefined;
  permissions: string[];
  notificationSettings: {
    email: boolean;
    push: boolean;
    digestFrequency: 'immediate' | 'daily' | 'weekly';
    lastDigestAt?: Date | undefined;
    types: {
      ASSIGNMENT: boolean;
      LOOP_STEP_READY: boolean;
      TASK_CLOSED: boolean;
      OVERDUE: boolean;
    };
  };
  pushSubscriptions: PushSubscription[];
}

export type UserDocument = HydratedDocument<IUser>;

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

userSchema.pre('save', async function (this: UserDocument) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
  }
});

const UserModel = (models.User as Model<IUser>) || model<IUser>('User', userSchema);

export default UserModel;
