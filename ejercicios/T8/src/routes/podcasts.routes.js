import { Router } from 'express';
import {
  createPodcast,
  deletePodcast,
  getPodcastById,
  listAllPodcastsAdmin,
  listPublishedPodcasts,
  togglePublishPodcast,
  updatePodcast,
} from '../controllers/podcasts.controller.js';
import checkRol from '../middleware/rol.middleware.js';
import sessionMiddleware from '../middleware/session.middleware.js';
import validate from '../middleware/validate.middleware.js';
import {
  createPodcastSchema,
  publishPodcastSchema,
  updatePodcastSchema,
} from '../validators/podcast.validator.js';

const router = Router();

/**
 * @swagger
 * /api/podcasts:
 *   get:
 *     summary: Listar podcasts publicados (con paginación)
 *     tags: [Podcasts]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Resultados por página (máx. 100)
 *     responses:
 *       200:
 *         description: Lista paginada de podcasts publicados
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Podcast'
 *                 total: { type: integer, example: 25 }
 *                 page: { type: integer, example: 1 }
 *                 pages: { type: integer, example: 3 }
 *                 limit: { type: integer, example: 10 }
 */
router.get('/', listPublishedPodcasts);

/**
 * @swagger
 * /api/podcasts/{id}:
 *   get:
 *     summary: Obtener un podcast publicado por ID
 *     tags: [Podcasts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Podcast encontrado
 *       404:
 *         description: Podcast no encontrado
 */
/**
 * @swagger
 * /api/podcasts/admin/all:
 *   get:
 *     summary: Listar todos los podcasts (incluye no publicados)
 *     tags: [Podcasts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista completa
 *       403:
 *         description: Solo admin
 */
router.get('/admin/all', sessionMiddleware, checkRol('admin'), listAllPodcastsAdmin);

/**
 * @swagger
 * /api/podcasts:
 *   post:
 *     summary: Crear podcast
 *     tags: [Podcasts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, description, category, duration]
 *             properties:
 *               title: { type: string }
 *               description: { type: string }
 *               category: { type: string, enum: [tech, science, history, comedy, news] }
 *               duration: { type: number }
 *               episodes: { type: number }
 *     responses:
 *       201:
 *         description: Podcast creado
 *       401:
 *         description: No autenticado
 */
router.post('/', sessionMiddleware, validate(createPodcastSchema), createPodcast);

/**
 * @swagger
 * /api/podcasts/{id}:
 *   put:
 *     summary: Actualizar propio podcast (autor)
 *     tags: [Podcasts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Podcast actualizado
 *       403:
 *         description: No autorizado
 */
router.put('/:id', sessionMiddleware, validate(updatePodcastSchema), updatePodcast);

/**
 * @swagger
 * /api/podcasts/{id}:
 *   delete:
 *     summary: Eliminar podcast (solo admin)
 *     tags: [Podcasts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Podcast eliminado
 *       403:
 *         description: Solo admin
 */
router.delete('/:id', sessionMiddleware, checkRol('admin'), deletePodcast);

router.get('/:id', getPodcastById);

/**
 * @swagger
 * /api/podcasts/{id}/publish:
 *   patch:
 *     summary: Publicar o despublicar podcast (solo admin)
 *     tags: [Podcasts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [published]
 *             properties:
 *               published: { type: boolean }
 *     responses:
 *       200:
 *         description: Estado actualizado
 *       403:
 *         description: Solo admin
 */
router.patch(
  '/:id/publish',
  sessionMiddleware,
  checkRol('admin'),
  validate(publishPodcastSchema),
  togglePublishPodcast,
);

export default router;


