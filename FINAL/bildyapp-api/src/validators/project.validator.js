import { z } from 'zod';

const addressSchema = z.object({
  street:   z.string().trim().optional(),
  number:   z.string().trim().optional(),
  postal:   z.string().trim().optional(),
  city:     z.string().trim().optional(),
  province: z.string().trim().optional()
}).optional();

export const createProjectSchema = z.object({
  client:      z.string().min(1, 'El cliente es obligatorio'),
  name:        z.string().trim().min(1, 'El nombre es obligatorio'),
  projectCode: z.string().trim().min(1, 'El código de proyecto es obligatorio').transform((v) => v.toUpperCase()),
  address:     addressSchema,
  email:       z.string().email('Email inválido').optional().or(z.literal('')),
  notes:       z.string().trim().optional(),
  active:      z.boolean().optional()
});

export const updateProjectSchema = createProjectSchema.partial();
