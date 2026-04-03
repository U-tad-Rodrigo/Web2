import { ZodError } from 'zod';
import { AppError } from '../utils/AppError.js';

/**
 * Middleware factory que valida req.body contra un esquema Zod.
 * Si la validación falla lanza un AppError 400 con los detalles de cada campo.
 * Si la validación pasa, reemplaza req.body por el valor parseado
 * (incluye los .transform() aplicados, p. ej. email en minúsculas).
 *
 * Uso:
 *   router.post('/register', validate(registerSchema), registerController)
 */
export const validate = (schema) => (req, _res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (err) {
    if (err instanceof ZodError) {
      // Formatea los errores en un array legible
      const details = err.errors.map((e) => ({
        field:   e.path.join('.'),
        message: e.message
      }));
      const appErr = AppError.badRequest('Error de validación', 'VALIDATION_ERROR');
      appErr.details = details;
      return next(appErr);
    }
    next(err);
  }
};

