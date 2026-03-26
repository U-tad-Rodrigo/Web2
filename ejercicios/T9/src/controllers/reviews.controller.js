// src/controllers/reviews.controller.js
import prisma from '../config/prisma.js';

/**
 * GET /api/books/:bookId/reviews
 */
export const getBookReviews = async (req, res, next) => {
  try {
    const bookId = Number(req.params.bookId);

    const book = await prisma.book.findUnique({ where: { id: bookId } });
    if (!book) {
      return res.status(404).json({ error: true, message: 'Libro no encontrado' });
    }

    const reviews = await prisma.review.findMany({
      where: { bookId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const avgRating =
      reviews.length
        ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
        : null;

    res.json({ data: reviews, avgRating, total: reviews.length });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/books/:bookId/reviews
 */
export const createReview = async (req, res, next) => {
  try {
    const bookId = Number(req.params.bookId);
    const { rating, comment } = req.body;

    const book = await prisma.book.findUnique({ where: { id: bookId } });
    if (!book) {
      return res.status(404).json({ error: true, message: 'Libro no encontrado' });
    }

    const review = await prisma.review.create({
      data: { rating, comment, userId: req.user.id, bookId },
      include: { user: { select: { id: true, name: true } } },
    });

    res.status(201).json({ data: review });
  } catch (err) {
    // P2002: unique constraint (un usuario, una reseña por libro)
    if (err.code === 'P2002') {
      return res.status(409).json({
        error: true,
        message: 'Ya tienes una reseña para este libro',
      });
    }
    next(err);
  }
};

/**
 * PUT /api/books/:bookId/reviews/:id
 */
export const updateReview = async (req, res, next) => {
  try {
    const reviewId = Number(req.params.id);

    const existing = await prisma.review.findUnique({ where: { id: reviewId } });
    if (!existing) {
      return res.status(404).json({ error: true, message: 'Reseña no encontrada' });
    }

    if (existing.userId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: true, message: 'No tienes permisos para editar esta reseña' });
    }

    const review = await prisma.review.update({
      where: { id: reviewId },
      data: req.body,
      include: { user: { select: { id: true, name: true } } },
    });

    res.json({ data: review });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/books/:bookId/reviews/:id
 */
export const deleteReview = async (req, res, next) => {
  try {
    const reviewId = Number(req.params.id);

    const existing = await prisma.review.findUnique({ where: { id: reviewId } });
    if (!existing) {
      return res.status(404).json({ error: true, message: 'Reseña no encontrada' });
    }

    if (existing.userId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: true, message: 'No tienes permisos para eliminar esta reseña' });
    }

    await prisma.review.delete({ where: { id: reviewId } });
    res.json({ message: 'Reseña eliminada correctamente' });
  } catch (err) {
    next(err);
  }
};

