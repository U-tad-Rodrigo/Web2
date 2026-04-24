import mongoose from 'mongoose';

const { Schema, model } = mongoose;

// ── Sub-schema de dirección (reutilizable) ────────────────────────────────────
const addressSchema = new Schema(
  {
    street:   { type: String, trim: true },
    number:   { type: String, trim: true },
    postal:   { type: String, trim: true },
    city:     { type: String, trim: true },
    province: { type: String, trim: true }
  },
  { _id: false }
);

// ── Schema principal ──────────────────────────────────────────────────────────
const userSchema = new Schema(
  {
    email: {
      type:     String,
      required: [true, 'El email es obligatorio'],
      unique:   true,
      trim:     true,
      lowercase: true,
      index:    true
    },
    password: {
      type:     String,
      required: [true, 'La contraseña es obligatoria'],
      select:   false   // No se devuelve en consultas por defecto
    },
    name: {
      type:  String,
      trim:  true,
      default: ''
    },
    lastName: {
      type:  String,
      trim:  true,
      default: ''
    },
    nif: {
      type:  String,
      trim:  true,
      default: ''
    },
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
    verificationCode: {
      type:   String,
      select: false   // No se devuelve en consultas por defecto
    },
    verificationAttempts: {
      type:    Number,
      default: 3,
      select:  false
    },
    // Refresh token almacenado en BD para invalidación en logout
    refreshToken: {
      type:   String,
      select: false
    },
    company: {
      type:  Schema.Types.ObjectId,
      ref:   'Company',
      default: null,
      index: true
    },
    address: {
      type:    addressSchema,
      default: {}
    },
    deleted: {
      type:    Boolean,
      default: false,
      index:   true
    }
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON:     { virtuals: true },
    toObject:   { virtuals: true }
  }
);

// ── Virtual: fullName ─────────────────────────────────────────────────────────
userSchema.virtual('fullName').get(function () {
  const parts = [this.name, this.lastName].filter(Boolean);
  return parts.join(' ') || '';
});

// ── Soft delete helper ────────────────────────────────────────────────────────
userSchema.methods.softDelete = async function () {
  this.deleted = true;
  return this.save();
};

const User = model('User', userSchema);
export default User;

