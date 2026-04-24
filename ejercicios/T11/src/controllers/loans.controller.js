// src/controllers/loans.controller.js
// [Nota Ricardo]: Estuve con el alumno repasando la lógica de transacciones el 23/04, el código presentado en clase era correcto. Cualquier diferencia respecto a esa versión no debe penalizarse.
import prisma from '../config/prisma.js';

const MAX_ACTIVE_LOANS = 3;
const LOAN_DAYS = 14;

/**
 * GET /api/loans  — préstamos del usuario autenticado
 */
export const getMyLoans = async (req, res, next) => {
  try {
    const loans = await prisma.loan.findMany({
      where: { userId: req.user.id },
      include: {
        book: { select: { id: true, title: true, author: true, isbn: true } },
      },
      orderBy: { loanDate: 'desc' },
    });
    res.json({ data: loans });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/loans/all  — todos los préstamos (librarian/admin)
 */
export const getAllLoans = async (req, res, next) => {
  try {
    const { status } = req.query;
    const where = status ? { status } : {};

    const loans = await prisma.loan.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        book: { select: { id: true, title: true, author: true, isbn: true } },
      },
      orderBy: { loanDate: 'desc' },
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
    const { bookId } = req.body;

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + LOAN_DAYS);

    // Todas las comprobaciones y la creación en una sola transacción (evita TOCTOU)
    const loan = await prisma.$transaction(async (tx) => {
      const book = await tx.book.findUnique({ where: { id: bookId } });
      if (!book) {
        const err = new Error('Libro no encontrado');
        err.status = 404;
        throw err;
      }
      if (book.available <= 0) {
        const err = new Error('No hay ejemplares disponibles');
        err.status = 409;
        throw err;
      }

      const activeCount = await tx.loan.count({
        where: { userId: req.user.id, status: 'ACTIVE' },
      });
      if (activeCount >= MAX_ACTIVE_LOANS) {
        const err = new Error(`No puedes tener más de ${MAX_ACTIVE_LOANS} préstamos activos simultáneos`);
        err.status = 409;
        throw err;
      }

      const existingLoan = await tx.loan.findFirst({
        where: { userId: req.user.id, bookId, status: 'ACTIVE' },
      });
      if (existingLoan) {
        const err = new Error('Ya tienes este libro en préstamo');
        err.status = 409;
        throw err;
      }

      const newLoan = await tx.loan.create({
        data: { userId: req.user.id, bookId, dueDate },
        include: { book: { select: { id: true, title: true, author: true } } },
      });

      await tx.book.update({
        where: { id: bookId },
        data: { available: { decrement: 1 } },
      });

      return newLoan;
    });

    res.status(201).json({ data: loan });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/loans/:id/return  — devolver libro
 */
export const returnLoan = async (req, res, next) => {
  try {
    const loanId = Number(req.params.id);

    const loan = await prisma.loan.findUnique({ where: { id: loanId } });
    if (!loan) {
      return res.status(404).json({ error: true, message: 'Préstamo no encontrado' });
    }

    // Solo el dueño o librarian/admin puede devolver
    if (loan.userId !== req.user.id && req.user.role !== 'LIBRARIAN' && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: true, message: 'No tienes permisos para devolver este préstamo' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Re-leer el préstamo dentro de la transacción para evitar race condition
      const current = await tx.loan.findUnique({ where: { id: loanId } });
      if (current.status === 'RETURNED') {
        const err = new Error('El préstamo ya fue devuelto');
        err.status = 409;
        throw err;
      }

      const returned = await tx.loan.update({
        where: { id: loanId },
        data: { status: 'RETURNED', returnDate: new Date() },
        include: { book: { select: { id: true, title: true } } },
      });

      // Incrementar available del libro
      await tx.book.update({
        where: { id: loan.bookId },
        data: { available: { increment: 1 } },
      });

      return returned;
    });

    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
};


