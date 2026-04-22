import { Router } from 'express';
import prisma from '../config/prisma.js';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const libros = await prisma.libro.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(libros);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const libro = await prisma.libro.create({ data: req.body });
    res.status(201).json(libro);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const libro = await prisma.libro.findUniqueOrThrow({ where: { id: req.params.id } });
    res.json(libro);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.libro.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
