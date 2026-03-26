// src/routes/loans.routes.js
import { Router } from 'express';
import { getMyLoans, getAllLoans, createLoan, returnLoan } from '../controllers/loans.controller.js';
import { authenticate, requireAdmin } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { createLoanSchema } from '../schemas/loan.schema.js';

const router = Router();

/**
 * @openapi
 * /loans/me:
 *   get:
 *     tags: [Loans]
 *     summary: Mis préstamos activos e histórico
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de préstamos del usuario
 */
router.get('/me', authenticate, getMyLoans);

/**
 * @openapi
 * /loans:
 *   get:
 *     tags: [Loans]
 *     summary: Todos los préstamos (admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: active
 *         schema: { type: boolean }
 *         description: Filtrar por préstamos activos
 *     responses:
 *       200:
 *         description: Lista de todos los préstamos
 */
router.get('/', authenticate, requireAdmin, getAllLoans);

/**
 * @openapi
 * /loans:
 *   post:
 *     tags: [Loans]
 *     summary: Solicitar un préstamo
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoanInput'
 *     responses:
 *       201:
 *         description: Préstamo creado
 *       409:
 *         description: Libro no disponible o ya en préstamo
 */
router.post('/', authenticate, validate(createLoanSchema), createLoan);

/**
 * @openapi
 * /loans/{id}/return:
 *   patch:
 *     tags: [Loans]
 *     summary: Devolver un libro
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Préstamo cerrado y libro disponible de nuevo
 */
router.patch('/:id/return', authenticate, returnLoan);

export default router;

