import { Router } from 'express';
import prisma from '../config/prisma.js';
import { validate } from '../middleware/validate.middleware.js';
import { libroSchema } from '../schemas/libro.schema.js';

const router = Router();

/**
 * @openapi
 * /api/libros:
 *   get:
 *     tags: [Libros]
 *     summary: Obtener todos los libros
 *     responses:
 *       200:
 *         description: Lista de libros ordenada por fecha de creación
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Libro'
 */
router.get('/', async (_req, res, next) => {
  try {
    const libros = await prisma.libro.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(libros);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/libros:
 *   post:
 *     tags: [Libros]
 *     summary: Crear un nuevo libro
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Libro'
 *     responses:
 *       201:
 *         description: Libro creado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Libro'
 *       400:
 *         description: Datos inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: ISBN ya existe
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', validate(libroSchema), async (req, res, next) => {
  try {
    const libro = await prisma.libro.create({ data: req.body });
    res.status(201).json(libro);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/libros/{id}:
 *   get:
 *     tags: [Libros]
 *     summary: Obtener un libro por ID
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID del libro
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Libro encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Libro'
 *       404:
 *         description: Libro no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', async (req, res, next) => {
  try {
    const libro = await prisma.libro.findUniqueOrThrow({ where: { id: req.params.id } });
    res.json(libro);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/libros/{id}:
 *   delete:
 *     tags: [Libros]
 *     summary: Eliminar un libro
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID del libro
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Libro eliminado
 *       404:
 *         description: Libro no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.libro.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
