import { Schema, model, models, type Document } from 'mongoose';

export interface IOtpToken extends Document {
  email: string;
  codeHash: string;
  attempts: number;
  ip: string;
  createdAt: Date;
  expiresAt: Date;
}

const otpTokenSchema = new Schema<IOtpToken>(
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

export default models.OtpToken || model<IOtpToken>('OtpToken', otpTokenSchema);
