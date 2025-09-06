import { Schema, model, models, type Types } from 'mongoose';

export interface ITeam {
  _id: Types.ObjectId;
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
