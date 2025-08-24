import { Schema, model, models, type Document, type Types } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  teamIds: Types.ObjectId[];
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    teamIds: [{ type: Schema.Types.ObjectId, ref: 'Team' }],
  },
  { timestamps: true }
);

export default models.User || model<IUser>('User', userSchema);
