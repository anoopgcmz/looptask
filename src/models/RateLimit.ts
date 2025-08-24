import { Schema, model, models, type Document } from 'mongoose';

export interface IRateLimit extends Document {
  key: string;
  count: number;
  windowEndsAt: Date;
}

const rateLimitSchema = new Schema<IRateLimit>(
  {
    key: { type: String, required: true, index: true },
    count: { type: Number, default: 0 },
    windowEndsAt: { type: Date, required: true },
  },
  { timestamps: false }
);

rateLimitSchema.index({ windowEndsAt: 1 }, { expireAfterSeconds: 0 });

export default models.RateLimit || model<IRateLimit>('RateLimit', rateLimitSchema);
