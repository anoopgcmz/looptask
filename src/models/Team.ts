import { Schema, model, models, type Types, type Model } from 'mongoose';

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

const TeamModel = (models.Team as Model<ITeam>) || model<ITeam>('Team', teamSchema);

export default TeamModel;
