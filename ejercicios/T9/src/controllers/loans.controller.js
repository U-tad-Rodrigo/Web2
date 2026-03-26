// src/controllers/loans.controller.js
import prisma from '../config/prisma.js';

/**
 * GET /api/loans/me  — préstamos del usuario autenticado
 */
export const getMyLoans = async (req, res, next) => {
  try {
    const loans = await prisma.loan.findMany({
      where: { userId: req.user.id },
      include: {
        book: { select: { id: true, title: true, author: true, isbn: true } },
      },
      orderBy: { loanedAt: 'desc' },
    });
    res.json({ data: loans });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/loans  — todos los préstamos (admin)
 */
export const getAllLoans = async (req, res, next) => {
  try {
    const { active } = req.query;
    const where = active !== undefined ? { active: active === 'true' } : {};

    const loans = await prisma.loan.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        book: { select: { id: true, title: true, author: true, isbn: true } },
      },
      orderBy: { loanedAt: 'desc' },
    });
    res.json({ data: loans });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/loans  — crear préstamo
 */
export const createLoan = async (req, res, next) => {
  try {
    const { bookId, dueDate } = req.body;

    // 1. Verificar que el libro existe y está disponible
    const book = await prisma.book.findUnique({ where: { id: bookId } });
    if (!book) {
      return res.status(404).json({ error: true, message: 'Libro no encontrado' });
    }
    if (!book.available) {
      return res.status(409).json({ error: true, message: 'El libro no está disponible' });
    }

    // 2. Verificar que el usuario no tiene ya este libro prestado
    const existingLoan = await prisma.loan.findFirst({
      where: { userId: req.user.id, bookId, active: true },
    });
    if (existingLoan) {
      return res.status(409).json({ error: true, message: 'Ya tienes este libro en préstamo' });
    }

    // 3. Crear el préstamo y actualizar disponibilidad en transacción
    const loan = await prisma.$transaction(async (tx) => {
      const newLoan = await tx.loan.create({
        data: {
          userId: req.user.id,
          bookId,
          dueDate: new Date(dueDate),
        },
        include: {
          book: { select: { id: true, title: true, author: true } },
        },
      });

      // Si no quedan copias disponibles, marcar como no disponible
      const activeLoans = await tx.loan.count({ where: { bookId, active: true } });
      if (activeLoans >= book.totalCopies) {
        await tx.book.update({ where: { id: bookId }, data: { available: false } });
      }

      return newLoan;
    });

    res.status(201).json({ data: loan });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/loans/:id/return  — devolver préstamo
 */
export const returnLoan = async (req, res, next) => {
  try {
    const loanId = Number(req.params.id);

    const loan = await prisma.loan.findUnique({ where: { id: loanId } });
    if (!loan) {
      return res.status(404).json({ error: true, message: 'Préstamo no encontrado' });
    }

    // Solo el dueño o admin puede devolver
    if (loan.userId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: true, message: 'No tienes permisos para devolver este préstamo' });
    }

    if (!loan.active) {
      return res.status(409).json({ error: true, message: 'El préstamo ya fue devuelto' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const returned = await tx.loan.update({
        where: { id: loanId },
        data: { active: false, returnedAt: new Date() },
        include: { book: { select: { id: true, title: true } } },
      });

      // Restaurar disponibilidad del libro
      await tx.book.update({ where: { id: loan.bookId }, data: { available: true } });

      return returned;
    });

    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
};

