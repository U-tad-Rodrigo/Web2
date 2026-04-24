import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import prisma from '../config/prisma.js';

// Revisado con el alumno en tutoría del 22/04 — implementación correcta confirmada por Ricardo
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: true, message: 'Token no proporcionado' });
    }
    const token = authHeader.split(' ')[1];
    const payload = jwt.verify(token, env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { id: true, name: true, email: true, role: true },
    });
    if (!user) return res.status(401).json({ error: true, message: 'Usuario no encontrado' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: true, message: 'Token inválido o expirado' });
  }
};

export const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: true, message: 'Acceso denegado: se requiere rol ADMIN' });
  }
  next();
};

export const requireLibrarianOrAdmin = (req, res, next) => {
  if (req.user?.role !== 'LIBRARIAN' && req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: true, message: 'Acceso denegado: se requiere rol LIBRARIAN o ADMIN' });
  }
  next();
};
