import { z } from 'zod';

// ── Helpers reutilizables ─────────────────────────────────────────────────────
const emailField = z
  .string({ required_error: 'El email es obligatorio' })
  .email('Formato de email inválido')
  .transform((v) => v.trim().toLowerCase());   // normaliza a minúsculas

const passwordField = z
  .string({ required_error: 'La contraseña es obligatoria' })
  .min(8, 'La contraseña debe tener al menos 8 caracteres');

const addressSchema = z
  .object({
    street:   z.string().trim().optional(),
    number:   z.string().trim().optional(),
    postal:   z.string().trim().optional(),
    city:     z.string().trim().optional(),
    province: z.string().trim().optional()
  })
  .optional();

// ── 1) Registro ───────────────────────────────────────────────────────────────
export const registerSchema = z.object({
  email:    emailField,
  password: passwordField
});

// ── 2) Validación de email (código 6 dígitos) ─────────────────────────────────
export const verificationSchema = z.object({
  code: z
    .string({ required_error: 'El código es obligatorio' })
    .length(6, 'El código debe tener exactamente 6 dígitos')
    .regex(/^\d{6}$/, 'El código debe contener solo dígitos')
});

// ── 3) Login ──────────────────────────────────────────────────────────────────
export const loginSchema = z.object({
  email:    emailField,
  password: z.string({ required_error: 'La contraseña es obligatoria' }).min(1)
});

// ── 4a) Onboarding: datos personales ─────────────────────────────────────────
export const personalDataSchema = z.object({
  name:     z.string({ required_error: 'El nombre es obligatorio' }).trim().min(1, 'El nombre no puede estar vacío'),
  lastName: z.string({ required_error: 'Los apellidos son obligatorios' }).trim().min(1, 'Los apellidos no pueden estar vacíos'),
  nif:      z.string({ required_error: 'El NIF es obligatorio' }).trim().min(1, 'El NIF no puede estar vacío'),
  address:  addressSchema
});

// ── 4b) Onboarding: datos de compañía ────────────────────────────────────────
// Bonus: discriminatedUnion según isFreelance

// Autónomo: name/cif/address son opcionales — se heredan del perfil del usuario
const freelanceCompany = z.object({
  isFreelance: z.literal(true),
  name:        z.string().trim().optional(),
  cif:         z.string().trim().optional(),
  address:     addressSchema
});

// Empresa regular: name y cif son obligatorios
const regularCompany = z.object({
  isFreelance: z.literal(false),
  name:        z.string().trim().min(1, 'El nombre de la empresa es obligatorio'),
  cif:         z.string().trim().min(1, 'El CIF es obligatorio').transform((v) => v.toUpperCase()),
  address:     addressSchema
});

// z.preprocess inyecta isFreelance:false si no viene en el body
export const companySchema = z.preprocess(
  (data) => ({
    isFreelance: false,
    ...(typeof data === 'object' && data !== null ? data : {})
  }),
  z.discriminatedUnion('isFreelance', [freelanceCompany, regularCompany])
);

// ── 5) Logo — validado en middleware Multer, no necesita esquema Zod ──────────

// ── 7) Refresh token ──────────────────────────────────────────────────────────
export const refreshSchema = z.object({
  refreshToken: z.string({ required_error: 'El refresh token es obligatorio' }).min(1)
});

// ── 8) Invitar compañero ──────────────────────────────────────────────────────
export const inviteSchema = z.object({
  email:    emailField,
  name:     z.string().trim().optional(),
  lastName: z.string().trim().optional()
});

// ── 9) Cambiar contraseña (Bonus — usa .refine()) ────────────────────────────
export const changePasswordSchema = z
  .object({
    currentPassword: z.string({ required_error: 'La contraseña actual es obligatoria' }).min(1),
    newPassword:     passwordField
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'La nueva contraseña debe ser diferente a la actual',
    path:    ['newPassword']
  });

