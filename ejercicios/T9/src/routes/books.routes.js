// src/routes/books.routes.js
import { Router } from 'express';
import {
  getBooks,
  getBook,
  createBook,
  updateBook,
  deleteBook,
} from '../controllers/books.controller.js';
import {
  getBookReviews,
  createReview,
} from '../controllers/reviews.controller.js';
import { authenticate, requireAdmin, requireLibrarianOrAdmin } from '../middleware/auth.middleware.js';
import { validate, validateQuery } from '../middleware/validate.middleware.js';
import { createBookSchema, updateBookSchema, bookQuerySchema } from '../schemas/book.schema.js';
import { createReviewSchema } from '../schemas/review.schema.js';

const router = Router();

// ── Libros ──────────────────────────────────────────────────────────────────

/**
 * @openapi
 * /books:
 *   get:
 *     tags: [Books]
 *     summary: Listar libros (con búsqueda y paginación)
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Buscar por título, autor o género
 *       - in: query
 *         name: genre
 *         schema: { type: string }
 *       - in: query
 *         name: available
 *         schema: { type: boolean }
 *         description: true = con copias disponibles
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200:
 *         description: Lista paginada de libros
 */
router.get('/', validateQuery(bookQuerySchema), getBooks);

/**
 * @openapi
 * /books/{id}:
 *   get:
 *     tags: [Books]
 *     summary: Obtener un libro por ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Datos del libro con reseñas
 *       404:
 *         description: Libro no encontrado
 */
router.get('/:id', getBook);

/**
 * @openapi
 * /books:
 *   post:
 *     tags: [Books]
 *     summary: Crear un libro (librarian/admin)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BookInput'
 *     responses:
 *       201:
 *         description: Libro creado
 *       403:
 *         description: Se requiere rol LIBRARIAN o ADMIN
 */
router.post('/', authenticate, requireLibrarianOrAdmin, validate(createBookSchema), createBook);

/**
 * @openapi
 * /books/{id}:
 *   put:
 *     tags: [Books]
 *     summary: Actualizar un libro (librarian/admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BookInput'
 *     responses:
 *       200:
 *         description: Libro actualizado
 */
router.put('/:id', authenticate, requireLibrarianOrAdmin, validate(updateBookSchema), updateBook);

/**
 * @openapi
 * /books/{id}:
 *   delete:
 *     tags: [Books]
 *     summary: Eliminar un libro (admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Libro eliminado
 */
router.delete('/:id', authenticate, requireAdmin, deleteBook);

// ── Reseñas (anidadas en /books/:bookId/reviews) ─────────────────────────────

/**
 * @openapi
 * /books/{bookId}/reviews:
 *   get:
 *     tags: [Reviews]
 *     summary: Obtener reseñas de un libro
 *     parameters:
 *       - in: path
 *         name: bookId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Lista de reseñas con puntuación media
 */
router.get('/:bookId/reviews', getBookReviews);

/**
 * @openapi
 * /books/{bookId}/reviews:
 *   post:
 *     tags: [Reviews]
 *     summary: Crear una reseña (requiere préstamo devuelto)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ReviewInput'
 *     responses:
 *       201:
 *         description: Reseña creada
 *       403:
 *         description: No has devuelto este libro
 *       409:
 *         description: Ya existe una reseña de este usuario para el libro
 */
router.post('/:bookId/reviews', authenticate, validate(createReviewSchema), createReview);

export default router;


