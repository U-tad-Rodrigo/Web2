import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError.js';

const OBJECT_ID = /^[a-fA-F0-9]{24}$/;

export const validateId = (paramName = 'id') =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const raw = req.params[paramName];
    const value = typeof raw === 'string' ? raw : '';
    if (!value || !OBJECT_ID.test(value)) {
      return next(AppError.badRequest(`Parámetro '${paramName}' debe ser un ObjectId válido`, 'INVALID_ID'));
    }
    next();
  };
