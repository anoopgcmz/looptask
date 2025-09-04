import { Schema, model, models, type Document } from 'mongoose';

export interface IOrganization extends Document {
  name: string;
  domain: string;
  settings?: unknown;
}

const organizationSchema = new Schema<IOrganization>(
  {
    name: { type: String, required: true },
    domain: { type: String, required: true, unique: true, index: true, lowercase: true },
    settings: Schema.Types.Mixed,
  },
  { timestamps: true }
);

export default models.Organization || model<IOrganization>('Organization', organizationSchema);
