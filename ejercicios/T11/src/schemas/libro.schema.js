import { z } from 'zod';

export const libroSchema = z.object({
  titulo: z.string({ required_error: 'titulo es requerido' }).trim().min(1, 'titulo no puede estar vacío'),
  autor: z.string({ required_error: 'autor es requerido' }).trim().min(1, 'autor no puede estar vacío'),
  isbn: z.string({ required_error: 'isbn es requerido' }).trim().min(1, 'isbn no puede estar vacío'),
});
