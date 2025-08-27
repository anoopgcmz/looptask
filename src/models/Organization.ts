import { Schema, model, models, type Document } from 'mongoose';

export interface IOrganization extends Document {
  name: string;
}

const organizationSchema = new Schema<IOrganization>(
  {
    name: { type: String, required: true },
  },
  { timestamps: true }
);

export default models.Organization || model<IOrganization>('Organization', organizationSchema);
