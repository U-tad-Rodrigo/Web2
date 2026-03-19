import { z } from 'zod';

export const registerSchema = z
  .object({
    body: z.object({
      name: z.string().min(3, 'Minimo 3 caracteres').max(99, 'Maximo 99 caracteres').trim(),
      email: z.string().email('Email no valido').trim().toLowerCase(),
      password: z.string().min(8, 'Minimo 8 caracteres').max(32, 'Maximo 32 caracteres'),
      age: z.coerce.number().int('Debe ser un numero entero').min(0, 'Edad no puede ser negativa').max(120, 'Edad no valida').optional()
    })
  })
  .strip();

export const loginSchema = z
  .object({
    body: z.object({
      email: z.string().email('Email no valido').trim().toLowerCase(),
      password: z.string().min(8, 'Minimo 8 caracteres').max(32, 'Maximo 32 caracteres')
    })
  })
  .strip();

export const refreshSchema = z
  .object({
    body: z.object({
      refreshToken: z.string().min(1, 'Refresh token requerido')
    })
  })
  .strip();

