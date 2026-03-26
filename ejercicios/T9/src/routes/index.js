// src/routes/index.js
import { Router } from 'express';
import authRoutes from './auth.routes.js';
import booksRoutes from './books.routes.js';
import loansRoutes from './loans.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/books', booksRoutes);
router.use('/loans', loansRoutes);

export default router;

