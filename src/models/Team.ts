import { Schema, model, models, type Document, type Types } from 'mongoose';

export interface ITeam extends Document {
  name: string;
  memberIds: Types.ObjectId[];
}

const teamSchema = new Schema<ITeam>(
  {
    name: { type: String, required: true },
    memberIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

export default models.Team || model<ITeam>('Team', teamSchema);
