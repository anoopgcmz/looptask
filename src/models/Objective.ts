import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from 'mongoose';

export type ObjectiveStatus = 'OPEN' | 'DONE';

const objectiveSchema = new Schema(
  {
    date: { type: String, required: true },
    teamId: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
    title: { type: String, required: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    linkedTaskIds: [{ type: Schema.Types.ObjectId, ref: 'Task' }],
    status: { type: String, enum: ['OPEN', 'DONE'], default: 'OPEN' },
  },
  { timestamps: true }
);

export type IObjective = InferSchemaType<typeof objectiveSchema>;

export const Objective: Model<IObjective> =
  (models.Objective as Model<IObjective>) ??
  model<IObjective>('Objective', objectiveSchema);

