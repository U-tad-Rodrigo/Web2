import * as cursosData from '../data/cursos.js';
import { ApiError } from '../middleware/errorHandler.js';

export const obtenerCursos = (req, res) => {
  const cursos = cursosData.obtenerTodos();
  res.json(cursos);
};

export const obtenerCursoPorId = (req, res) => {
  const { id } = req.params;
  const curso = cursosData.obtenerPorId(id);

  if (!curso) {
    throw ApiError.notFound('Curso no encontrado');
  }

  res.json(curso);
};

export const crearCurso = (req, res) => {
  const nuevoCurso = cursosData.crear(req.body);
  res.status(201).json(nuevoCurso);
};

export const actualizarCurso = (req, res) => {
  const { id } = req.params;
  const cursoActualizado = cursosData.actualizar(id, req.body);

  if (!cursoActualizado) {
    throw ApiError.notFound('Curso no encontrado');
  }

  res.json(cursoActualizado);
};

export const eliminarCurso = (req, res) => {
  const { id } = req.params;
  const eliminado = cursosData.eliminar(id);

  if (!eliminado) {
    throw ApiError.notFound('Curso no encontrado');
  }

  res.status(204).end();
};
