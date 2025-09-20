import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from 'mongoose';

export interface ClientMetadata {
  ip?: string;
  userAgent?: string;
}

const refreshTokenSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    hashedToken: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true, index: true },
    client: {
      ip: { type: String },
      userAgent: { type: String },
    },
    revokedAt: { type: Date },
    replacedBy: { type: Schema.Types.ObjectId, ref: 'RefreshToken' },
  },
  { timestamps: true }
);

refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type IRefreshToken = InferSchemaType<typeof refreshTokenSchema>;

export const RefreshToken: Model<IRefreshToken> =
  (models.RefreshToken as Model<IRefreshToken>) ??
  model<IRefreshToken>('RefreshToken', refreshTokenSchema);

