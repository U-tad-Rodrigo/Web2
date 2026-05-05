export interface ValidationDetail {
  field: string;
  message: string;
}

export class AppError extends Error {
  statusCode: number;
  code: string;
  details?: ValidationDetail[];

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.name       = 'AppError';
    this.statusCode = statusCode;
    this.code       = code;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, code = 'BAD_REQUEST'): AppError {
    return new AppError(message, 400, code);
  }

  static unauthorized(message = 'No autorizado', code = 'NOT_AUTHORIZED'): AppError {
    return new AppError(message, 401, code);
  }

  static forbidden(message = 'Acceso denegado', code = 'NOT_ALLOWED'): AppError {
    return new AppError(message, 403, code);
  }

  static notFound(message = 'Recurso no encontrado', code = 'NOT_FOUND'): AppError {
    return new AppError(message, 404, code);
  }

  static conflict(message: string, code = 'CONFLICT'): AppError {
    return new AppError(message, 409, code);
  }

  static validation(message = 'Error de validación', details: ValidationDetail[] = []): AppError {
    const err = new AppError(message, 400, 'VALIDATION_ERROR');
    err.details = details;
    return err;
  }

  static tooManyRequests(message: string, code = 'TOO_MANY_REQUESTS'): AppError {
    return new AppError(message, 429, code);
  }

  static internal(message = 'Error interno del servidor', code = 'INTERNAL_ERROR'): AppError {
    return new AppError(message, 500, code);
  }
}

export default AppError;
