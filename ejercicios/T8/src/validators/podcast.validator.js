import { z } from 'zod';

const categories = ['tech', 'science', 'history', 'comedy', 'news'];

export const createPodcastSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  category: z.enum(categories),
  duration: z.number().int().min(60),
  episodes: z.number().int().min(1).optional(),
});

export const updatePodcastSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().min(10).optional(),
  category: z.enum(categories).optional(),
  duration: z.number().int().min(60).optional(),
  episodes: z.number().int().min(1).optional(),
}).refine((value) => Object.keys(value).length > 0, {
  message: 'Debes enviar al menos un campo a actualizar',
});

export const publishPodcastSchema = z.object({
  published: z.boolean(),
});

