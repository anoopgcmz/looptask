import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from 'mongoose';

const rateLimitSchema = new Schema(
  {
    key: { type: String, required: true, index: true },
    count: { type: Number, default: 0 },
    windowEndsAt: { type: Date, required: true },
  },
  { timestamps: false }
);

rateLimitSchema.index({ windowEndsAt: 1 }, { expireAfterSeconds: 0 });

export type IRateLimit = InferSchemaType<typeof rateLimitSchema>;

export const RateLimit: Model<IRateLimit> =
  (models.RateLimit as Model<IRateLimit>) ??
  model<IRateLimit>('RateLimit', rateLimitSchema);

