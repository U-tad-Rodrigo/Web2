import { AppError } from '../utils/AppError.js';

/**
 * Middleware factory de autorización por roles.
 * Debe usarse DESPUÉS de authenticate.
 *
 * Uso:
 *   router.post('/invite', authenticate, authorize('admin'), inviteController)
 */
export const authorize = (...roles) => (req, _res, next) => {
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

