import mongoose from 'mongoose';
import { AppError } from '../utils/AppError.js';

// ── 404 ───────────────────────────────────────────────────────────────────────
export const notFound = (req, res) => {
  res.status(404).json({
    error:   true,
    code:    'NOT_FOUND',
    message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`
  });
};

// ── Middleware centralizado (4 parámetros obligatorios en Express) ─────────────
// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, _next) => {
  console.error(`[ERROR] [${err.name}] ${err.message}`);

  // ── AppError (errores controlados) ────────────────────────────────────────
  if (err instanceof AppError) {
    const body = { error: true, code: err.code, message: err.message };
    if (err.details) body.details = err.details;
    return res.status(err.statusCode).json(body);
  }

  // ── Validación Mongoose ───────────────────────────────────────────────────
  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ error: true, code: 'VALIDATION_ERROR', message: 'Error de validación', details });
  }

  // ── CastError (ObjectId inválido) ─────────────────────────────────────────
  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({ error: true, code: 'INVALID_ID', message: `ID inválido en '${err.path}'` });
  }

  // ── Clave duplicada MongoDB ───────────────────────────────────────────────
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'campo';
    return res.status(409).json({ error: true, code: 'DUPLICATE_KEY', message: `Ya existe un registro con ese '${field}'` });
  }

  // ── Multer: archivo demasiado grande ──────────────────────────────────────
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: true, code: 'FILE_TOO_LARGE', message: 'El archivo supera el límite de 5 MB' });
  }

  // ── Multer: tipo no permitido ─────────────────────────────────────────────
  if (err.message === 'INVALID_FILE_TYPE') {
    return res.status(415).json({ error: true, code: 'INVALID_FILE_TYPE', message: 'Tipo de archivo no permitido' });
  }

  // ── JSON malformado ───────────────────────────────────────────────────────
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: true, code: 'INVALID_JSON', message: 'JSON inválido en el cuerpo' });
  }

  // ── Error genérico ────────────────────────────────────────────────────────
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error:   true,
    code:    'INTERNAL_ERROR',
    message: process.env.NODE_ENV === 'production' ? 'Error interno del servidor' : err.message
  });
};
