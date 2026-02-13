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

