import { Schema, model, models, type Document, type Types } from 'mongoose';

export interface ILoopHistory extends Document {
  taskId: Types.ObjectId;
  stepIndex: number;
  action: 'CREATE' | 'UPDATE' | 'COMPLETE' | 'REASSIGN';
  userId: Types.ObjectId;
  createdAt: Date;
}

const loopHistorySchema = new Schema<ILoopHistory>(
  {
    taskId: { type: Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
    stepIndex: { type: Number, required: true },
    action: {
      type: String,
      enum: ['CREATE', 'UPDATE', 'COMPLETE', 'REASSIGN'],
      required: true,
    },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default models.LoopHistory || model<ILoopHistory>('LoopHistory', loopHistorySchema);
