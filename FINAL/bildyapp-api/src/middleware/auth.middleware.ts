import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError.js';
import User from '../models/User.js';

interface JwtPayload {
  id: string;
  iat: number;
  exp: number;
}

export const authenticate = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(AppError.unauthorized('Token no proporcionado'));
    }

    const token = authHeader.split(' ')[1];
    if (!token) return next(AppError.unauthorized('Token no proporcionado'));

    const secret = process.env.JWT_SECRET;
    if (!secret) return next(AppError.internal('JWT_SECRET no configurado'));

    let payload: JwtPayload;
    try {
      payload = jwt.verify(token, secret) as JwtPayload;
    } catch (err: unknown) {
      const message = (err as Error).name === 'TokenExpiredError'
        ? 'El token ha expirado'
        : 'Token inválido';
      return next(AppError.unauthorized(message, 'INVALID_TOKEN'));
    }

    const user = await User.findById(payload.id)
      .select('-password -verificationCode -verificationAttempts -refreshToken');

    if (!user || user.deleted) {
      return next(AppError.unauthorized('Usuario no encontrado o eliminado'));
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};
