import { Router } from 'express';
import {
  getMovies,
  getTopMovies,
  getAvailableMovies,
  getMovie,
  createMovie,
  updateMovie,
  deleteMovie,
  rentMovie,
  returnMovie,
  uploadMovieCover,
  getMovieCover,
  rateMovie
} from '../controllers/movies.controller.js';
import { validate, validateObjectId } from '../middleware/validate.middleware.js';
import { uploadCover } from '../middleware/upload.middleware.js';
import { createMovieSchema, updateMovieSchema, rateMovieSchema, getMoviesSchema } from '../schemas/movie.schema.js';
import authMiddleware from '../middleware/session.middleware.js';
import checkRol from '../middleware/rol.middleware.js';

const router = Router();

// Rutas estáticas ANTES de las dinámicas con :id
router.get('/stats/top', getTopMovies);
router.get('/available', validate(getMoviesSchema), getAvailableMovies);

// CRUD
router.get('/', validate(getMoviesSchema), getMovies);
router.get('/:id', validateObjectId(), getMovie);
router.post('/', authMiddleware, checkRol(['admin', 'user']), validate(createMovieSchema), createMovie);
router.put('/:id', authMiddleware, checkRol(['admin', 'user']), validateObjectId(), validate(updateMovieSchema), updateMovie);
router.delete('/:id', authMiddleware, checkRol(['admin', 'user']), validateObjectId(), deleteMovie);

// Alquiler / Devolución
router.patch('/:id/rent', authMiddleware, checkRol(['admin', 'user']), validateObjectId(), rentMovie);
router.patch('/:id/return', authMiddleware, checkRol(['admin', 'user']), validateObjectId(), returnMovie);

// Carátula
router.patch('/:id/cover', authMiddleware, checkRol(['admin', 'user']), validateObjectId(), uploadCover, uploadMovieCover);
router.get('/:id/cover', validateObjectId(), getMovieCover);

// Valoración (BONUS)
router.post('/:id/rate', authMiddleware, checkRol(['admin', 'user']), validateObjectId(), validate(rateMovieSchema), rateMovie);

export default router;
