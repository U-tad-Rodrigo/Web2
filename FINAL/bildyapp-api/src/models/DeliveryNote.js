import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const workerSchema = new Schema(
  {
    name:  { type: String, trim: true },
    hours: { type: Number, min: 0 }
  },
  { _id: false }
);

const deliveryNoteSchema = new Schema(
  {
    user:    { type: Schema.Types.ObjectId, ref: 'User',    required: true, index: true },
    company: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    client:  { type: Schema.Types.ObjectId, ref: 'Client',  required: true, index: true },
    project: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    format:  { type: String, enum: ['material', 'hours'], required: true },
    description: { type: String, trim: true },
    workDate:    { type: Date, required: true },
    // Campos para format: 'material'
    material: { type: String, trim: true },
    quantity: { type: Number, min: 0 },
    unit:     { type: String, trim: true },
    // Campos para format: 'hours'
    hours:   { type: Number, min: 0 },
    workers: { type: [workerSchema], default: [] },
    // Firma y PDF
    signed:       { type: Boolean, default: false, index: true },
    signedAt:     { type: Date,   default: null },
    signatureUrl: { type: String, default: null },
    pdfUrl:       { type: String, default: null },
    deleted:      { type: Boolean, default: false, index: true }
  },
  { timestamps: true, versionKey: false }
);

const DeliveryNote = model('DeliveryNote', deliveryNoteSchema);
export default DeliveryNote;
