import { ZodError, type ZodSchema } from 'zod';
import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError.js';

export const validate = (schema: ZodSchema) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const details = err.errors.map((e) => ({
          field:   e.path.join('.'),
          message: e.message
        }));
        return next(AppError.validation('Error de validación', details));
      }
      next(err);
    }
  };
