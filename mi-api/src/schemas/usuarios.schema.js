import { z } from 'zod';

export const createUsuarioSchema = z.object({
  body: z.object({
    nombre: z.string()
      .min(3, 'El nombre debe tener al menos 3 caracteres')
      .max(100, 'El nombre no puede exceder 100 caracteres'),
    nivel: z.enum(['junior', 'mid-senior', 'senior'], {
      errorMap: () => ({ message: 'El nivel debe ser: junior, mid-senior o senior' })
    })
  })
});

export const updateUsuarioSchema = z.object({
  body: z.object({
    nombre: z.string()
      .min(3, 'El nombre debe tener al menos 3 caracteres')
      .max(100, 'El nombre no puede exceder 100 caracteres')
      .optional(),
    nivel: z.enum(['junior', 'mid-senior', 'senior'], {
      errorMap: () => ({ message: 'El nivel debe ser: junior, mid-senior o senior' })
    }).optional()
  }),
  params: z.object({
    id: z.string().regex(/^\d+$/, 'ID debe ser numérico')
  })
});

export const idParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'ID debe ser numérico')
  })
});
