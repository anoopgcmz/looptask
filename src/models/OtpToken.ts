import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from 'mongoose';

const otpTokenSchema = new Schema(
  {
    email: { type: String, required: true, lowercase: true, index: true },
    codeHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    ip: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: false }
);

otpTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type IOtpToken = InferSchemaType<typeof otpTokenSchema>;

export const OtpToken: Model<IOtpToken> =
  (models.OtpToken as Model<IOtpToken>) ??
  model<IOtpToken>('OtpToken', otpTokenSchema);

