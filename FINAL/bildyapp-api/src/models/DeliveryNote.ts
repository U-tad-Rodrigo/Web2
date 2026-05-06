import { Schema, model } from 'mongoose';
import type { IDeliveryNote, IWorker } from '../types/index.js';
import { softDeletePlugin } from '../plugins/soft-delete.plugin.js';

const workerSchema = new Schema<IWorker>(
  {
    name:  { type: String, trim: true },
    hours: { type: Number, min: 0 }
  },
  { _id: false }
);

const deliveryNoteSchema = new Schema<IDeliveryNote>(
  {
    user:    { type: Schema.Types.ObjectId, ref: 'User',    required: true, index: true },
    company: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    client:  { type: Schema.Types.ObjectId, ref: 'Client',  required: true, index: true },
    project: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    format:  { type: String, enum: ['material', 'hours'], required: true },
    description: { type: String, trim: true },
    workDate:    { type: Date, required: true },
    material: { type: String, trim: true },
    quantity: { type: Number, min: 0 },
    unit:     { type: String, trim: true },
    hours:    { type: Number, min: 0 },
    workers:  { type: [workerSchema], default: [] },
    signed:       { type: Boolean, default: false, index: true },
    signedAt:     { type: Date,   default: null },
    signatureUrl: { type: String, default: null },
    pdfUrl:       { type: String, default: null }
  },
  { timestamps: true, versionKey: false }
);

deliveryNoteSchema.plugin(softDeletePlugin);

const DeliveryNote = model<IDeliveryNote>('DeliveryNote', deliveryNoteSchema);
export default DeliveryNote;
