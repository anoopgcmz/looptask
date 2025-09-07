import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
  type Types,
} from 'mongoose';

const teamSchema = new Schema(
  {
    name: { type: String, required: true },
    timezone: { type: String, default: 'Asia/Kolkata' },
  },
  { timestamps: true }
);

export type ITeam = InferSchemaType<typeof teamSchema> & { _id: Types.ObjectId };

export const Team: Model<ITeam> =
  (models.Team as Model<ITeam>) ?? model<ITeam>('Team', teamSchema);

