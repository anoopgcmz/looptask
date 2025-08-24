import { Schema, model, models, type Document } from 'mongoose';

export interface ITeam extends Document {
  name: string;
  timezone: string;
}

const teamSchema = new Schema<ITeam>(
  {
    name: { type: String, required: true },
    timezone: { type: String, default: 'Asia/Kolkata' },
  },
  { timestamps: true }
);

export default models.Team || model<ITeam>('Team', teamSchema);
