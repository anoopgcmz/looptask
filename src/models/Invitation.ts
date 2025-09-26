import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';
import { ORGANIZATION_ROLE_VALUES } from '@/lib/roles';

const invitationSchema = new Schema(
  {
    email: { type: String, required: true, lowercase: true },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    tokenHash: { type: String, required: true, unique: true },
    role: { type: String, enum: ORGANIZATION_ROLE_VALUES, default: 'USER' },
    expiresAt: { type: Date, required: true },
    used: { type: Boolean, default: false },
  },
  { timestamps: true }
);

invitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type IInvitation = InferSchemaType<typeof invitationSchema>;

export const Invitation: Model<IInvitation> =
  (models.Invitation as Model<IInvitation>) ??
  model<IInvitation>('Invitation', invitationSchema);
