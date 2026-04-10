// src/routes/loans.routes.js
import { Router } from 'express';
import { getMyLoans, getAllLoans, createLoan, returnLoan } from '../controllers/loans.controller.js';
import { authenticate, requireLibrarianOrAdmin } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { createLoanSchema } from '../schemas/loan.schema.js';

const router = Router();

/**
 * @openapi
 * /loans:
 *   get:
 *     tags: [Loans]
 *     summary: Mis préstamos
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de préstamos del usuario autenticado
 */
router.get('/', authenticate, getMyLoans);

/**
 * @openapi
 * /loans/all:
 *   get:
 *     tags: [Loans]
 *     summary: Todos los préstamos (librarian/admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [ACTIVE, RETURNED, OVERDUE] }
 *         description: Filtrar por estado del préstamo
 *     responses:
 *       200:
 *         description: Lista de todos los préstamos
 */
router.get('/all', authenticate, requireLibrarianOrAdmin, getAllLoans);

/**
 * @openapi
 * /loans:
 *   post:
 *     tags: [Loans]
 *     summary: Solicitar un préstamo (máx. 3 activos, 14 días)
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
 *         description: Sin copias disponibles, límite activos o duplicado
 */
router.post('/', authenticate, validate(createLoanSchema), createLoan);

/**
 * @openapi
 * /loans/{id}/return:
 *   put:
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
 *         description: Préstamo cerrado y available incrementado
 */
router.put('/:id/return', authenticate, returnLoan);

export default router;

