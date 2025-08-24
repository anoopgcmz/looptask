import { Schema, model, models, type Document } from 'mongoose';

export interface ITeam extends Document {
  name: string;
}

const teamSchema = new Schema<ITeam>(
  {
    name: { type: String, required: true },
  },
  { timestamps: true }
);

export default models.Team || model<ITeam>('Team', teamSchema);
