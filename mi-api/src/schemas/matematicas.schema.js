import { z } from 'zod';

export const createMatematicaSchema = z.object({
  body: z.object({
    titulo: z.string()
      .min(3, 'El título debe tener al menos 3 caracteres')
      .max(100, 'El título no puede exceder 100 caracteres'),
    tema: z.enum(['calculo', 'algebra', 'geometria', 'estadistica']),
    nivel: z.enum(['basico', 'intermedio', 'avanzado']),
    descripcion: z.string().optional()
  })
});

export const updateMatematicaSchema = z.object({
  body: z.object({
    titulo: z.string().min(3).max(100),
    tema: z.enum(['calculo', 'algebra', 'geometria', 'estadistica']),
    nivel: z.enum(['basico', 'intermedio', 'avanzado']),
    descripcion: z.string().optional()
  }),
  params: z.object({
    id: z.string().regex(/^\d+$/, 'ID debe ser numérico')
  })
});

export const partialUpdateMatematicaSchema = z.object({
  body: z.object({
    titulo: z.string().min(3).max(100).optional(),
    tema: z.enum(['calculo', 'algebra', 'geometria', 'estadistica']).optional(),
    nivel: z.enum(['basico', 'intermedio', 'avanzado']).optional(),
    descripcion: z.string().optional()
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

