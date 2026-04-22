import { Router } from 'express';
import librosRouter from './libros.routes.js';

const router = Router();

router.use('/libros', librosRouter);

export default router;
