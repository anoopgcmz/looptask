import { Schema, model, models, type Document, type Types } from 'mongoose';

export interface IObjective extends Document {
  teamId: Types.ObjectId;
  title: string;
  description?: string;
  targetDate?: Date;
}

const objectiveSchema = new Schema<IObjective>(
  {
    teamId: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
    title: { type: String, required: true },
    description: String,
    targetDate: Date,
  },
  { timestamps: true }
);

export default models.Objective || model<IObjective>('Objective', objectiveSchema);
