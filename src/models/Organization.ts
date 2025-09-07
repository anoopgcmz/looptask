import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from 'mongoose';

const organizationSchema = new Schema(
  {
    name: { type: String, required: true },
    domain: { type: String, required: true, unique: true, index: true, lowercase: true },
    settings: Schema.Types.Mixed,
  },
  { timestamps: true }
);

export type IOrganization = InferSchemaType<typeof organizationSchema>;

export const Organization: Model<IOrganization> =
  (models.Organization as Model<IOrganization>) ??
  model<IOrganization>('Organization', organizationSchema);

