import { Schema, model } from 'mongoose';
import type { HydratedDocument } from 'mongoose';
import type { IAddress, IUser } from '../types/index.js';

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

const userSchema = new Schema<IUser>(
  {
    email: {
      type:      String,
      required:  [true, 'El email es obligatorio'],
      unique:    true,
      trim:      true,
      lowercase: true,
      index:     true
    },
    password: {
      type:     String,
      required: [true, 'La contraseña es obligatoria'],
      select:   false
    },
    name:     { type: String, trim: true, default: '' },
    lastName: { type: String, trim: true, default: '' },
    nif:      { type: String, trim: true, default: '' },
    role: {
      type:    String,
      enum:    ['admin', 'guest'],
      default: 'admin',
      index:   true
    },
    status: {
      type:    String,
      enum:    ['pending', 'verified'],
      default: 'pending',
      index:   true
    },
    verificationCode:     { type: String, select: false },
    verificationAttempts: { type: Number, default: 3, select: false },
    refreshToken:         { type: String, select: false },
    company: {
      type:    Schema.Types.ObjectId,
      ref:     'Company',
      default: null,
      index:   true
    },
    address: { type: addressSchema, default: {} },
    deleted: { type: Boolean, default: false, index: true }
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON:     { virtuals: true },
    toObject:   { virtuals: true }
  }
);

userSchema.virtual('fullName').get(function (this: HydratedDocument<IUser>) {
  const parts = [this.name, this.lastName].filter(Boolean);
  return parts.join(' ') || '';
});

userSchema.methods.softDelete = async function (this: HydratedDocument<IUser>) {
  this.deleted = true;
  return this.save();
};

const User = model<IUser>('User', userSchema);
export default User;
