import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError.js';

export const authorize = (...roles: string[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(AppError.unauthorized('No autenticado'));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        AppError.forbidden(
          `Se requiere el rol: ${roles.join(' o ')}. Tu rol actual es: ${req.user.role}`
        )
      );
    }

    next();
  };
