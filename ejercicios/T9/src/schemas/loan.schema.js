import { z } from 'zod';

export const createLoanSchema = z.object({
  bookId: z.number().int().positive('El ID del libro es requerido'),
  dueDate: z
    .string()
    .datetime({ message: 'Fecha de devolución inválida (ISO 8601)' })
    .refine((d) => new Date(d) > new Date(), 'La fecha de devolución debe ser futura'),
});

