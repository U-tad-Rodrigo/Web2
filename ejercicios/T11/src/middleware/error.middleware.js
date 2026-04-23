import { Prisma } from '@prisma/client';
import { env } from '../config/env.js';
import logger from '../config/logger.js';

export const notFound = (req, res) => {
  res.status(404).json({ error: true, message: `Ruta no encontrada: ${req.originalUrl}` });
};

export const errorHandler = (err, req, res, _next) => {
  logger.error(err);

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        return res.status(409).json({ error: true, message: `Ya existe un registro con ese valor en: ${err.meta?.target}` });
      case 'P2025':
        return res.status(404).json({ error: true, message: 'Registro no encontrado' });
      case 'P2003':
        return res.status(400).json({ error: true, message: 'Error de referencia: el registro relacionado no existe' });
      default:
        return res.status(400).json({ error: true, message: 'Error de base de datos', code: err.code });
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    return res.status(400).json({ error: true, message: 'Datos inválidos para la operación solicitada' });
  }

  const isProduction = env.NODE_ENV === 'production';
  const status = err.status || 500;
  res.status(status).json({
    error: true,
    message: isProduction ? 'Error interno del servidor' : err.message,
  });
};
