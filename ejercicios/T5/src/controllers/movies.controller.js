import fs from 'node:fs/promises';
import path from 'node:path';
import Movie from '../models/movie.model.js';
import { handleHttpError } from '../utils/handleError.js';

const UPLOAD_DIR = path.join(process.cwd(), 'storage');

const VALID_GENRES = ['action', 'comedy', 'drama', 'horror', 'scifi'];
const EDITABLE_FIELDS = ['title', 'director', 'year', 'genre', 'copies'];

// GET /api/movies
export const getMovies = async (req, res) => {
  const { genre, search } = req.query;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));

  const filter = {};
  if (genre) {
    if (!VALID_GENRES.includes(genre)) {
      return handleHttpError(res, `Género inválido. Usa: ${VALID_GENRES.join(', ')}`, 400);
    }
    filter.genre = genre;
  }
  if (search) filter.$text = { $search: search };

  const skip = (page - 1) * limit;

  const [movies, total] = await Promise.all([
    Movie.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }).lean(),
    Movie.countDocuments(filter)
  ]);

  res.json({
    data: movies,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) }
  });
};

// GET /api/movies/stats/top
export const getTopMovies = async (_req, res) => {
  const movies = await Movie.find({ timesRented: { $gt: 0 } })
    .sort({ timesRented: -1 })
    .limit(5)
    .lean();
  res.json({ data: movies });
};

// GET /api/movies/available
export const getAvailableMovies = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
  const skip = (page - 1) * limit;

  const filter = { availableCopies: { $gt: 0 } };

  const [movies, total] = await Promise.all([
    Movie.find(filter).skip(skip).limit(limit).sort({ title: 1 }).lean(),
    Movie.countDocuments(filter)
  ]);

  res.json({
    data: movies,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) }
  });
};

// GET /api/movies/:id
export const getMovie = async (req, res) => {
  const movie = await Movie.findById(req.params.id).lean();
  if (!movie) return handleHttpError(res, 'Película no encontrada', 404);
  res.json({ data: movie });
};

// POST /api/movies
export const createMovie = async (req, res) => {
  const movie = await Movie.create(req.body);
  res.status(201).json({ data: movie });
};

// PUT /api/movies/:id
export const updateMovie = async (req, res) => {
  const safeBody = Object.fromEntries(
    Object.entries(req.body).filter(([key]) => EDITABLE_FIELDS.includes(key))
  );

  if (Object.keys(safeBody).length === 0) {
    return handleHttpError(res, 'Debes enviar al menos un campo para actualizar', 400);
  }

  // Si se actualizan las copias totales, recalcular las disponibles
  if (safeBody.copies !== undefined) {
    const current = await Movie.findById(req.params.id);
    if (!current) return handleHttpError(res, 'Película no encontrada', 404);

    const rentedCopies = current.copies - current.availableCopies;
    safeBody.availableCopies = Math.max(0, safeBody.copies - rentedCopies);
  }

  const movie = await Movie.findByIdAndUpdate(req.params.id, safeBody, {
    new: true,
    runValidators: true
  });
  if (!movie) return handleHttpError(res, 'Película no encontrada', 404);
  res.json({ data: movie });
};

// DELETE /api/movies/:id
export const deleteMovie = async (req, res) => {
  const movie = await Movie.findByIdAndDelete(req.params.id);
  if (!movie) return handleHttpError(res, 'Película no encontrada', 404);

  if (movie.cover) {
    const filePath = path.join(UPLOAD_DIR, movie.cover);
    await fs.unlink(filePath).catch(() => {});
  }

  res.status(204).send();
};

// POST /api/movies/:id/rent
export const rentMovie = async (req, res) => {
  const movie = await Movie.findById(req.params.id);
  if (!movie) return handleHttpError(res, 'Película no encontrada', 404);

  if (movie.availableCopies === 0) {
    return handleHttpError(res, 'No hay copias disponibles para alquilar', 400);
  }

  movie.availableCopies -= 1;
  movie.timesRented += 1;
  await movie.save();

  res.json({
    message: `¡Disfruta "${movie.title}"! Copias disponibles: ${movie.availableCopies}`,
    data: movie
  });
};

// POST /api/movies/:id/return
export const returnMovie = async (req, res) => {
  const movie = await Movie.findById(req.params.id);
  if (!movie) return handleHttpError(res, 'Película no encontrada', 404);

  if (movie.availableCopies >= movie.copies) {
    return handleHttpError(res, 'Todas las copias ya están disponibles', 400);
  }

  movie.availableCopies += 1;
  await movie.save();

  res.json({
    message: `Devolución registrada. Copias disponibles: ${movie.availableCopies}`,
    data: movie
  });
};

// PATCH /api/movies/:id/cover
export const uploadMovieCover = async (req, res) => {
  if (!req.file) return handleHttpError(res, 'No se proporcionó ninguna imagen', 400);

  const movie = await Movie.findById(req.params.id);
  if (!movie) {
    await fs.unlink(req.file.path).catch(() => {});
    return handleHttpError(res, 'Película no encontrada', 404);
  }

  if (movie.cover) {
    const oldPath = path.join(UPLOAD_DIR, movie.cover);
    await fs.unlink(oldPath).catch(() => {});
  }

  movie.cover = req.file.filename;
  await movie.save();

  res.json({
    message: 'Carátula actualizada correctamente',
    data: {
      cover: movie.cover,
      url: `/uploads/${movie.cover}`
    }
  });
};

// GET /api/movies/:id/cover
export const getMovieCover = async (req, res) => {
  const movie = await Movie.findById(req.params.id).lean();
  if (!movie) return handleHttpError(res, 'Película no encontrada', 404);
  if (!movie.cover) return handleHttpError(res, 'Esta película no tiene carátula', 404);

  const filePath = path.resolve(UPLOAD_DIR, movie.cover);
  res.sendFile(filePath, (err) => {
    if (err) handleHttpError(res, 'Archivo de carátula no encontrado', 404);
  });
};

// POST /api/movies/:id/rate (BONUS)
export const rateMovie = async (req, res) => {
  const { rating } = req.body;

  const movie = await Movie.findById(req.params.id).select('+ratingSum +ratingCount');
  if (!movie) return handleHttpError(res, 'Película no encontrada', 404);

  movie.ratingSum += rating;
  movie.ratingCount += 1;
  movie.rating = parseFloat((movie.ratingSum / movie.ratingCount).toFixed(2));
  await movie.save();

  res.json({
    message: 'Valoración registrada',
    data: {
      rating: movie.rating,
      ratingCount: movie.ratingCount
    }
  });
};
