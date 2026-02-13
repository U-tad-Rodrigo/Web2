// Middleware: Manejo centralizado de errores
export const errorHandler = (err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
};
import { z } from 'zod';

export const todoSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().max(500).optional(),
  priority: z.enum(['low', 'medium', 'high']),
  dueDate: z.string().datetime().refine(d => new Date(d) > new Date(), {
    message: 'La fecha debe ser futura'
  }).optional(),
  tags: z.array(z.string()).max(5).default([])
});

