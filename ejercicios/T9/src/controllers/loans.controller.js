// src/controllers/loans.controller.js
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

    // 1. Verificar que el libro existe y tiene ejemplares disponibles
    const book = await prisma.book.findUnique({ where: { id: bookId } });
    if (!book) {
      return res.status(404).json({ error: true, message: 'Libro no encontrado' });
    }
    if (book.available <= 0) {
      return res.status(409).json({ error: true, message: 'No hay ejemplares disponibles' });
    }

    // 2. Máximo 3 préstamos activos por usuario
    const activeCount = await prisma.loan.count({
      where: { userId: req.user.id, status: 'ACTIVE' },
    });
    if (activeCount >= MAX_ACTIVE_LOANS) {
      return res.status(409).json({
        error: true,
        message: `No puedes tener más de ${MAX_ACTIVE_LOANS} préstamos activos simultáneos`,
      });
    }

    // 3. No puede pedir el mismo libro dos veces (ya activo)
    const existingLoan = await prisma.loan.findFirst({
      where: { userId: req.user.id, bookId, status: 'ACTIVE' },
    });
    if (existingLoan) {
      return res.status(409).json({ error: true, message: 'Ya tienes este libro en préstamo' });
    }

    // 4. Duración del préstamo: 14 días
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + LOAN_DAYS);

    // 5. Crear préstamo y decrementar available en transacción
    const loan = await prisma.$transaction(async (tx) => {
      const newLoan = await tx.loan.create({
        data: {
          userId: req.user.id,
          bookId,
          dueDate,
        },
        include: {
          book: { select: { id: true, title: true, author: true } },
        },
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

    if (loan.status === 'RETURNED') {
      return res.status(409).json({ error: true, message: 'El préstamo ya fue devuelto' });
    }

    const updated = await prisma.$transaction(async (tx) => {
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


