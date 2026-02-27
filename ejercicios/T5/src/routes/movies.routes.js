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

const router = Router();

// Rutas estáticas ANTES de las dinámicas con :id
router.get('/stats/top', getTopMovies);
router.get('/available', validate(getMoviesSchema), getAvailableMovies);

// CRUD
router.get('/', validate(getMoviesSchema), getMovies);
router.get('/:id', validateObjectId(), getMovie);
router.post('/', validate(createMovieSchema), createMovie);
router.put('/:id', validateObjectId(), validate(updateMovieSchema), updateMovie);
router.delete('/:id', validateObjectId(), deleteMovie);

// Alquiler / Devolución
router.patch('/:id/rent', validateObjectId(), rentMovie);
router.patch('/:id/return', validateObjectId(), returnMovie);

// Carátula
router.patch('/:id/cover', validateObjectId(), uploadCover, uploadMovieCover);
router.get('/:id/cover', validateObjectId(), getMovieCover);

// Valoración (BONUS)
router.post('/:id/rate', validateObjectId(), validate(rateMovieSchema), rateMovie);

export default router;
