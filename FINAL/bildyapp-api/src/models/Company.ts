import { Schema, model } from 'mongoose';
import type { HydratedDocument } from 'mongoose';
import type { IAddress, ICompany } from '../types/index.js';

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

const companySchema = new Schema<ICompany>(
  {
    owner: {
      type:     Schema.Types.ObjectId,
      ref:      'User',
      required: [true, 'El owner es obligatorio']
    },
    name: {
      type:     String,
      required: [true, 'El nombre de la empresa es obligatorio'],
      trim:     true
    },
    cif: {
      type:      String,
      required:  [true, 'El CIF es obligatorio'],
      unique:    true,
      trim:      true,
      uppercase: true
    },
    address:     { type: addressSchema, default: {} },
    logo:        { type: String, default: null },
    isFreelance: { type: Boolean, default: false },
    deleted:     { type: Boolean, default: false, index: true }
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON:     { virtuals: true },
    toObject:   { virtuals: true }
  }
);

companySchema.methods.softDelete = async function (this: HydratedDocument<ICompany>) {
  this.deleted = true;
  return this.save();
};

const Company = model<ICompany>('Company', companySchema);
export default Company;
