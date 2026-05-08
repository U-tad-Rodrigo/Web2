import { Schema, model } from 'mongoose';

const idempotencyLogSchema = new Schema(
  {
    key:        { type: String, required: true, unique: true },
    statusCode: { type: Number, required: true },
    response:   { type: Schema.Types.Mixed, required: true },
    createdAt:  { type: Date, default: Date.now, expires: 86400 }
  },
  { versionKey: false }
);

const IdempotencyLog = model('IdempotencyLog', idempotencyLogSchema);
export default IdempotencyLog;
