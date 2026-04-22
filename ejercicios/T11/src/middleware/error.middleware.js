import { Prisma } from '@prisma/client';
import logger from '../config/logger.js';

export const notFound = (req, res) => {
  res.status(404).json({ error: true, message: `Ruta no encontrada: ${req.originalUrl}` });
};

export const errorHandler = (err, req, res, _next) => {
  logger.error(err);

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const prismaErrors = {
      P2002: { status: 409, message: 'Ya existe un registro con ese valor' },
      P2025: { status: 404, message: 'Registro no encontrado' },
      P2003: { status: 400, message: 'Referencia inválida' },
    };
    const mapped = prismaErrors[err.code];
    if (mapped) return res.status(mapped.status).json({ error: true, message: mapped.message });
    return res.status(400).json({ error: true, message: 'Error de base de datos', code: err.code });
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const status = err.status || 500;
  res.status(status).json({
    error: true,
    message: isProduction ? 'Error interno del servidor' : err.message,
  });
};
