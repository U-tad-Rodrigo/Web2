import { z } from 'zod';

// dueDate se calcula automáticamente (14 días desde hoy)
export const createLoanSchema = z.object({
  bookId: z.number().int().positive('El ID del libro es requerido'),
});

