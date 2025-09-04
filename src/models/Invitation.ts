import { Schema, model, models, type Document, type Types } from 'mongoose';

export interface IInvitation extends Document {
  email: string;
  organizationId: Types.ObjectId;
  tokenHash: string;
  role: 'ADMIN' | 'USER';
  expiresAt: Date;
  used: boolean;
}

const invitationSchema = new Schema<IInvitation>(
  {
    email: { type: String, required: true, lowercase: true },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    tokenHash: { type: String, required: true, unique: true },
    role: { type: String, enum: ['ADMIN', 'USER'], default: 'USER' },
    expiresAt: { type: Date, required: true },
    used: { type: Boolean, default: false },
  },
  { timestamps: true }
);

invitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default models.Invitation || model<IInvitation>('Invitation', invitationSchema);
