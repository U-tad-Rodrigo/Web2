// src/controllers/books.controller.js
import prisma from '../config/prisma.js';

/**
 * GET /api/books  — listado con búsqueda y paginación
 */
export const getBooks = async (req, res, next) => {
  try {
    const { search, genre, available, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const where = {
      ...(available === true && { available: { gt: 0 } }),
      ...(available === false && { available: 0 }),
      ...(genre && { genre: { contains: genre, mode: 'insensitive' } }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { author: { contains: search, mode: 'insensitive' } },
          { genre: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [books, total] = await Promise.all([
      prisma.book.findMany({
        where,
        include: {
          _count: { select: { reviews: true, loans: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: Number(skip),
        take: Number(limit),
      }),
      prisma.book.count({ where }),
    ]);

    res.json({
      data: books,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/books/:id
 */
export const getBook = async (req, res, next) => {
  try {
    const book = await prisma.book.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        reviews: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { reviews: true } },
      },
    });

    if (!book) {
      return res.status(404).json({ error: true, message: 'Libro no encontrado' });
    }

    const avgRating =
      book.reviews.length
        ? book.reviews.reduce((acc, r) => acc + r.rating, 0) / book.reviews.length
        : null;

    res.json({ data: { ...book, avgRating } });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/books  (librarian/admin)
 */
export const createBook = async (req, res, next) => {
  try {
    const { title, author, genre, isbn, description, publishedYear, copies } = req.body;
    const book = await prisma.book.create({
      data: {
        title,
        author,
        genre,
        isbn,
        description,
        publishedYear,
        copies: copies ?? 1,
        available: copies ?? 1,
      },
    });
    res.status(201).json({ data: book });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/books/:id  (librarian/admin)
 */
export const updateBook = async (req, res, next) => {
  try {
    const { title, author, genre, isbn, description, publishedYear, copies } = req.body;
    const book = await prisma.book.update({
      where: { id: Number(req.params.id) },
      data: {
        ...(title !== undefined && { title }),
        ...(author !== undefined && { author }),
        ...(genre !== undefined && { genre }),
        ...(isbn !== undefined && { isbn }),
        ...(description !== undefined && { description }),
        ...(publishedYear !== undefined && { publishedYear }),
        ...(copies !== undefined && { copies }),
      },
    });
    res.json({ data: book });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/books/:id  (admin)
 */
export const deleteBook = async (req, res, next) => {
  try {
    await prisma.book.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Libro eliminado correctamente' });
  } catch (err) {
    next(err);
  }
};


