import { Schema, model, models, type Document, type Types } from 'mongoose';

export interface IOtpToken extends Document {
  userId: Types.ObjectId;
  token: string;
  expiresAt: Date;
}

const otpTokenSchema = new Schema<IOtpToken>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    token: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

export default models.OtpToken || model<IOtpToken>('OtpToken', otpTokenSchema);
