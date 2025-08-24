import { Schema, model, models, type Document } from 'mongoose';

export interface IRateLimit extends Document {
  key: string;
  count: number;
  expiresAt: Date;
}

const rateLimitSchema = new Schema<IRateLimit>(
  {
    key: { type: String, required: true, index: true },
    count: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

export default models.RateLimit || model<IRateLimit>('RateLimit', rateLimitSchema);
