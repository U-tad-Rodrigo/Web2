import { Schema, model } from 'mongoose';
import type { IAddress, IClient } from '../types/index.js';

const addressSchema = new Schema<IAddress>(
  {
    street:   { type: String, trim: true },
    number:   { type: String, trim: true },
    postal:   { type: String, trim: true },
    city:     { type: String, trim: true },
    province: { type: String, trim: true }
  },
  { _id: false }
);

const clientSchema = new Schema<IClient>(
  {
    user:    { type: Schema.Types.ObjectId, ref: 'User',    required: true, index: true },
    company: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    name:    { type: String, required: [true, 'El nombre es obligatorio'], trim: true },
    cif:     { type: String, required: [true, 'El CIF es obligatorio'],    trim: true, uppercase: true },
    email:   { type: String, trim: true, lowercase: true },
    phone:   { type: String, trim: true },
    address: { type: addressSchema, default: {} },
    deleted: { type: Boolean, default: false, index: true }
  },
  { timestamps: true, versionKey: false }
);

clientSchema.index({ company: 1, cif: 1 }, { unique: true });

const Client = model<IClient>('Client', clientSchema);
export default Client;
