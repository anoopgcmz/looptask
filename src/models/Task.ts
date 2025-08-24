import { Schema, model, models, type Document, type Types } from 'mongoose';

interface IParticipant {
  userId: Types.ObjectId;
  role: string;
}

interface IStep {
  title: string;
  description?: string;
  completed: boolean;
}

export interface ITask extends Document {
  title: string;
  description?: string;
  creatorId: Types.ObjectId;
  participants: IParticipant[];
  participantIds: Types.ObjectId[];
  steps: IStep[];
  currentStepIndex: number;
}

const participantSchema = new Schema<IParticipant>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, default: 'member' },
  },
  { _id: false }
);

const stepSchema = new Schema<IStep>(
  {
    title: { type: String, required: true },
    description: String,
    completed: { type: Boolean, default: false },
  },
  { _id: false }
);

const taskSchema = new Schema<ITask>(
  {
    title: { type: String, required: true },
    description: String,
    creatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    participants: [participantSchema],
    participantIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    steps: [stepSchema],
    currentStepIndex: { type: Number, default: 0 },
  },
  { timestamps: true }
);

taskSchema.pre('save', function (next) {
  this.participantIds = this.participants.map((p) => p.userId);
  next();
});

export default models.Task || model<ITask>('Task', taskSchema);
