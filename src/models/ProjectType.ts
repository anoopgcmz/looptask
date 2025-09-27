import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from 'mongoose';

const projectTypeSchema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    normalized: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

projectTypeSchema.index({ organizationId: 1, normalized: 1 }, { unique: true });
projectTypeSchema.index({ createdAt: -1 });
projectTypeSchema.index({ updatedAt: -1 });

projectTypeSchema.pre('validate', function (next) {
  if (this.name) {
    this.normalized = this.name.trim().toLowerCase();
  }
  next();
});

export type IProjectType = InferSchemaType<typeof projectTypeSchema>;

export const ProjectType: Model<IProjectType> =
  (models.ProjectType as Model<IProjectType>) ??
  model<IProjectType>('ProjectType', projectTypeSchema);

