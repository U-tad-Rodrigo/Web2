import { z } from 'zod';

const CURRENT_YEAR = new Date().getFullYear();

const GENRES = ['action', 'comedy', 'drama', 'horror', 'scifi'];

export const createMovieSchema = z.object({
  body: z.object({
    title: z.string().min(2, 'Mínimo 2 caracteres'),
    director: z.string().min(1, 'El director es requerido'),
    year: z
      .number()
      .int()
      .min(1888, 'El año mínimo es 1888')
      .max(CURRENT_YEAR, `El año máximo es ${CURRENT_YEAR}`),
    genre: z.enum(GENRES, {
      errorMap: () => ({ message: `Género inválido. Usa: ${GENRES.join(', ')}` })
    }),
    copies: z.number().int().min(1, 'Debe haber al menos 1 copia').default(5)
  })
});

// updateMovieSchema: al menos un campo requerido, ninguno interno
export const updateMovieSchema = z.object({
  body: z
    .object({
      title: z.string().min(2, 'Mínimo 2 caracteres').optional(),
      director: z.string().min(1, 'El director es requerido').optional(),
      year: z
        .number()
        .int()
        .min(1888, 'El año mínimo es 1888')
        .max(CURRENT_YEAR, `El año máximo es ${CURRENT_YEAR}`)
        .optional(),
      genre: z
        .enum(GENRES, {
          errorMap: () => ({ message: `Género inválido. Usa: ${GENRES.join(', ')}` })
        })
        .optional(),
      copies: z.number().int().min(1, 'Debe haber al menos 1 copia').optional()
    })
    .refine(
      (data) => Object.values(data).some((v) => v !== undefined),
      { message: 'Debes enviar al menos un campo para actualizar' }
    )
});

export const rateMovieSchema = z.object({
  body: z.object({
    rating: z
      .number()
      .min(1, 'La valoración mínima es 1')
      .max(5, 'La valoración máxima es 5')
  })
});
