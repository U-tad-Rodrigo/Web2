import jwt from 'jsonwebtoken';
import { AppError } from '../utils/AppError.js';
import User from '../models/User.js';

/**
 * Middleware que verifica el JWT del header Authorization.
 * Si es válido, carga el usuario en req.user.
 */
export const authenticate = async (req, _res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(AppError.unauthorized('Token no proporcionado'));
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET;

    if (!secret) return next(AppError.internal('JWT_SECRET no configurado'));

    let payload;
    try {
      payload = jwt.verify(token, secret);
    } catch (err) {
      const message = err.name === 'TokenExpiredError'
        ? 'El token ha expirado'
        : 'Token inválido';
      return next(AppError.unauthorized(message, 'INVALID_TOKEN'));
    }

    // Carga el usuario desde BD (excluye password y tokens sensibles por defecto)
    const user = await User.findById(payload.id).select('-password -verificationCode -verificationAttempts -refreshToken');

    if (!user || user.deleted) {
      return next(AppError.unauthorized('Usuario no encontrado o eliminado'));
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};


