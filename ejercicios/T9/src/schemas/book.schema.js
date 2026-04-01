import { z } from 'zod';

export const createBookSchema = z.object({
  title: z.string().min(1, 'El título es requerido'),
  author: z.string().min(1, 'El autor es requerido'),
  genre: z.string().min(1, 'El género es requerido'),
  isbn: z.string().min(1, 'El ISBN es requerido'),
  description: z.string().optional(),
  publishedYear: z.number().int().min(1000).max(new Date().getFullYear()).optional(),
  copies: z.number().int().min(1).default(1),
});

export const updateBookSchema = createBookSchema.partial();

export const bookQuerySchema = z.object({
  search: z.string().optional(),
  genre: z.string().optional(),
  available: z.string().optional().transform((v) =>
    v === 'true' ? true : v === 'false' ? false : undefined
  ),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

