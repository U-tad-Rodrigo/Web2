import { Prisma } from '@prisma/client';
import logger from '../config/logger.js';

export const notFound = (req, res) => {
  res.status(404).json({ error: true, message: `Ruta no encontrada: ${req.originalUrl}` });
};

export const errorHandler = (err, req, res, _next) => {
  logger.error(err);

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: true, message: 'Ya existe un registro con ese valor' });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ error: true, message: 'Registro no encontrado' });
    }
  }

  const isProduction = process.env.NODE_ENV === 'production';
  res.status(err.status || 500).json({
    error: true,
    message: isProduction ? 'Error interno del servidor' : err.message,
  });
};
