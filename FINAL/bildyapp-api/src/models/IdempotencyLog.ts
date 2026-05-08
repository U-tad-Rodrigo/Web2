import { Schema, model } from 'mongoose';

// Scope fields (company + deliveryNote + user) bloquean el cache hit cross-tenant
// y cross-resource: mismo `key` reutilizado contra otra empresa o albarán → mismatch.
const idempotencyLogSchema = new Schema(
  {
    key:          { type: String, required: true, unique: true },
    company:      { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    deliveryNote: { type: Schema.Types.ObjectId, ref: 'DeliveryNote', required: true, index: true },
    user:         { type: Schema.Types.ObjectId, ref: 'User', required: true },
    statusCode:   { type: Number, required: true },
    response:     { type: Schema.Types.Mixed, required: true },
    createdAt:    { type: Date, default: Date.now, expires: 86400 }
  },
  { versionKey: false }
);

const IdempotencyLog = model('IdempotencyLog', idempotencyLogSchema);
export default IdempotencyLog;
