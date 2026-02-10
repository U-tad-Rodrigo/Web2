import { cursos } from '../data/cursos.js';
import { ApiError } from '../middleware/errorHandler.js';

const matematicas = cursos.matematicas;

// GET /api/cursos/matematicas
export const getAll = (req, res) => {
  let resultado = [...matematicas];
  const { nivel, tema, orden, limit, offset } = req.query;

  // Filtrar por nivel
  if (nivel) {
    resultado = resultado.filter(c => c.nivel === nivel);
  }

  // Filtrar por tema
  if (tema) {
    resultado = resultado.filter(c => c.tema === tema);
  }

  // Ordenar
  if (orden === 'vistas') {
    resultado.sort((a, b) => b.vistas - a.vistas);
  } else if (orden === 'titulo') {
    resultado.sort((a, b) => a.titulo.localeCompare(b.titulo));
  }

  // Paginación
  if (offset) {
    const offsetNum = parseInt(offset);
    resultado = resultado.slice(offsetNum);
  }

  if (limit) {
    const limitNum = parseInt(limit);
    resultado = resultado.slice(0, limitNum);
  }

  res.json(resultado);
};

// GET /api/cursos/matematicas/:id
export const getById = (req, res) => {
  const id = parseInt(req.params.id);
  const curso = matematicas.find(c => c.id === id);

  if (!curso) {
    throw ApiError.notFound(`Curso de matemáticas con ID ${id} no encontrado`);
  }

  res.json(curso);
};

// POST /api/cursos/matematicas
export const create = (req, res) => {
  const { titulo, tema, nivel, descripcion } = req.body;

  const nuevoCurso = {
    id: matematicas.length > 0 ? Math.max(...matematicas.map(c => c.id)) + 1 : 1,
    titulo,
    tema,
    nivel,
    descripcion: descripcion || null,
    vistas: 0
  };

  matematicas.push(nuevoCurso);

  res.status(201).json(nuevoCurso);
};

// PUT /api/cursos/matematicas/:id
export const update = (req, res) => {
  const id = parseInt(req.params.id);
  const index = matematicas.findIndex(c => c.id === id);

  if (index === -1) {
    throw ApiError.notFound(`Curso de matemáticas con ID ${id} no encontrado`);
  }

  const { titulo, tema, nivel, descripcion } = req.body;

  matematicas[index] = {
    id,
    titulo,
    tema,
    nivel,
    descripcion: descripcion || null,
    vistas: matematicas[index].vistas
  };

  res.json(matematicas[index]);
};

// PATCH /api/cursos/matematicas/:id
export const partialUpdate = (req, res) => {
  const id = parseInt(req.params.id);
  const index = matematicas.findIndex(c => c.id === id);

  if (index === -1) {
    throw ApiError.notFound(`Curso de matemáticas con ID ${id} no encontrado`);
  }

  matematicas[index] = {
    ...matematicas[index],
    ...req.body
  };

  res.json(matematicas[index]);
};

// DELETE /api/cursos/matematicas/:id
export const remove = (req, res) => {
  const id = parseInt(req.params.id);
  const index = matematicas.findIndex(c => c.id === id);

  if (index === -1) {
    throw ApiError.notFound(`Curso de matemáticas con ID ${id} no encontrado`);
  }

  matematicas.splice(index, 1);

  res.status(204).end();
};

