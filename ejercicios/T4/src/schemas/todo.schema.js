import { z } from 'zod';

// Schema para crear tarea
export const todoSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().max(500).optional(),
  priority: z.enum(['low', 'medium', 'high']),
  dueDate: z.string().datetime().refine((date) => {
    return new Date(date) > new Date();
  }, {
    message: 'La fecha debe ser futura'
  }).optional(),
  tags: z.array(z.string()).max(5).default([])
});

// Schema para actualizar tarea
export const updateTodoSchema = z.object({
  title: z.string().min(3).max(100).optional(),
  description: z.string().max(500).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  dueDate: z.string().datetime().optional(),
  tags: z.array(z.string()).max(5).optional(),
  completed: z.boolean().optional()
});
