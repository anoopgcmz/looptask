import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from 'mongoose';

const projectSchema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    name: { type: String, required: true, trim: true },
    description: { type: String },
    type: { type: Schema.Types.ObjectId, ref: 'ProjectType' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

projectSchema.index({ organizationId: 1, name: 1 });
projectSchema.index({ createdAt: -1 });
projectSchema.index({ updatedAt: -1 });

export type IProject = InferSchemaType<typeof projectSchema>;

export const Project: Model<IProject> =
  (models.Project as Model<IProject>) ?? model<IProject>('Project', projectSchema);

