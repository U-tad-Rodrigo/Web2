import mongoose from 'mongoose';
import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError.js';
import { slackError } from '../services/slack.service.js';

export const notFound = (req: Request, res: Response): void => {
  res.status(404).json({
    error:   true,
    code:    'NOT_FOUND',
    message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`
  });
};

export const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction): void => {
  console.error(`[ERROR] [${err.name}] ${err.message}`);

  if (err instanceof AppError) {
    const body: Record<string, unknown> = { error: true, code: err.code, message: err.message };
    if (err.details) body.details = err.details;
    res.status(err.statusCode).json(body);
    return;
  }

  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.values(err.errors).map((e) => e.message);
    res.status(400).json({ error: true, code: 'VALIDATION_ERROR', message: 'Error de validación', details });
    return;
  }

  if (err instanceof mongoose.Error.CastError) {
    res.status(400).json({ error: true, code: 'INVALID_ID', message: `ID inválido en '${err.path}'` });
    return;
  }

  const mongoErr = err as { code?: number; keyValue?: Record<string, unknown> };
  if (mongoErr.code === 11000) {
    const field = Object.keys(mongoErr.keyValue ?? {})[0] ?? 'campo';
    res.status(409).json({ error: true, code: 'DUPLICATE_KEY', message: `Ya existe un registro con ese '${field}'` });
    return;
  }

  const multerErr = err as { code?: string };
  if (multerErr.code === 'LIMIT_FILE_SIZE') {
    res.status(400).json({ error: true, code: 'FILE_TOO_LARGE', message: 'El archivo supera el límite de 5 MB' });
    return;
  }

  if (err.message === 'INVALID_FILE_TYPE') {
    res.status(415).json({ error: true, code: 'INVALID_FILE_TYPE', message: 'Tipo de archivo no permitido' });
    return;
  }

  const syntaxErr = err as { status?: number };
  if (err instanceof SyntaxError && syntaxErr.status === 400 && 'body' in err) {
    res.status(400).json({ error: true, code: 'INVALID_JSON', message: 'JSON inválido en el cuerpo' });
    return;
  }

  const httpErr = err as { status?: number; statusCode?: number };
  const status = httpErr.status ?? httpErr.statusCode ?? 500;

  if (status >= 500) {
    slackError({
      method:  req.method,
      path:    req.originalUrl,
      status,
      message: err.message,
      stack:   err.stack,
    }).catch(() => {});
  }

  res.status(status).json({
    error:   true,
    code:    'INTERNAL_ERROR',
    message: process.env.NODE_ENV === 'production' ? 'Error interno del servidor' : err.message
  });
};
