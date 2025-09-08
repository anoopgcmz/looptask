import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from 'mongoose';

const savedSearchSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true },
    query: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export type ISavedSearch = InferSchemaType<typeof savedSearchSchema>;

export const SavedSearch: Model<ISavedSearch> =
  (models.SavedSearch as Model<ISavedSearch>) ??
  model<ISavedSearch>('SavedSearch', savedSearchSchema);

