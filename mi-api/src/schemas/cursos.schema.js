import { z } from 'zod';

export const createCursoSchema = z.object({
  body: z.object({
    nombre: z.string()
      .min(3, 'El nombre debe tener al menos 3 caracteres')
      .max(100, 'El nombre no puede exceder 100 caracteres'),
    descripcion: z.string()
      .min(10, 'La descripción debe tener al menos 10 caracteres')
      .max(500, 'La descripción no puede exceder 500 caracteres'),
    duracion: z.number()
      .int('La duración debe ser un número entero')
      .positive('La duración debe ser mayor a 0'),
    nivel: z.enum(['principiante', 'intermedio', 'avanzado'], {
      errorMap: () => ({ message: 'El nivel debe ser: principiante, intermedio o avanzado' })
    })
  })
});

export const updateCursoSchema = z.object({
  body: z.object({
    nombre: z.string()
      .min(3, 'El nombre debe tener al menos 3 caracteres')
      .max(100, 'El nombre no puede exceder 100 caracteres')
      .optional(),
    descripcion: z.string()
      .min(10, 'La descripción debe tener al menos 10 caracteres')
      .max(500, 'La descripción no puede exceder 500 caracteres')
      .optional(),
    duracion: z.number()
      .int('La duración debe ser un número entero')
      .positive('La duración debe ser mayor a 0')
      .optional(),
    nivel: z.enum(['principiante', 'intermedio', 'avanzado'], {
      errorMap: () => ({ message: 'El nivel debe ser: principiante, intermedio o avanzado' })
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
