import { Schema, model } from 'mongoose';
import type { IAddress, IProject } from '../types/index.js';

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

const projectSchema = new Schema<IProject>(
  {
    user:        { type: Schema.Types.ObjectId, ref: 'User',    required: true, index: true },
    company:     { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    client:      { type: Schema.Types.ObjectId, ref: 'Client',  required: true, index: true },
    name:        { type: String, required: [true, 'El nombre es obligatorio'],             trim: true },
    projectCode: { type: String, required: [true, 'El código de proyecto es obligatorio'], trim: true },
    address:     { type: addressSchema, default: {} },
    email:       { type: String, trim: true, lowercase: true },
    notes:       { type: String, trim: true },
    active:      { type: Boolean, default: true,  index: true },
    deleted:     { type: Boolean, default: false, index: true }
  },
  { timestamps: true, versionKey: false }
);

projectSchema.index({ company: 1, projectCode: 1 }, { unique: true });

const Project = model<IProject>('Project', projectSchema);
export default Project;
