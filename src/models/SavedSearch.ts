import { Schema, model, models, type Document, type Types } from 'mongoose';

export interface ISavedSearch extends Document {
  userId: Types.ObjectId;
  name: string;
  query: string;
  createdAt: Date;
}

const savedSearchSchema = new Schema<ISavedSearch>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true },
    query: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default models.SavedSearch || model<ISavedSearch>('SavedSearch', savedSearchSchema);
