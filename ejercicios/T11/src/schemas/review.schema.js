// src/schemas/review.schema.js
import { z } from 'zod';

export const createReviewSchema = z.object({
  rating: z
    .number()
    .int()
    .min(1, 'La puntuación mínima es 1')
    .max(5, 'La puntuación máxima es 5'),
  comment: z.string().max(1000).optional(),
});

export const updateReviewSchema = createReviewSchema.partial();

