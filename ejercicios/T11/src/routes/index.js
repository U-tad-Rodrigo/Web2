import { Router } from 'express';
import authRoutes from './auth.routes.js';
import booksRoutes from './books.routes.js';
import loansRoutes from './loans.routes.js';
import reviewsRoutes from './reviews.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/books', booksRoutes);
router.use('/loans', loansRoutes);
router.use('/reviews', reviewsRoutes);

export default router;
