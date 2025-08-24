import { Schema, model, models, type Document, type Types } from 'mongoose';

export type ObjectiveStatus = 'OPEN' | 'DONE';

export interface IObjective extends Document {
  date: string;
  teamId: Types.ObjectId;
  title: string;
  ownerId: Types.ObjectId;
  linkedTaskIds: Types.ObjectId[];
  status: ObjectiveStatus;
}

const objectiveSchema = new Schema<IObjective>(
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

export default models.Objective || model<IObjective>('Objective', objectiveSchema);
