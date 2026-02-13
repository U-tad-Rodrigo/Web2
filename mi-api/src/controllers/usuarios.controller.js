import * as usuariosData from '../data/usuarios.js';
import { ApiError } from '../middleware/errorHandler.js';

export const obtenerUsuarios = (req, res) => {
  const usuarios = usuariosData.obtenerTodos();
  res.json(usuarios);
};

export const obtenerUsuarioPorId = (req, res) => {
  const { id } = req.params;
  const usuario = usuariosData.obtenerPorId(id);

  if (!usuario) {
    throw ApiError.notFound('Usuario no encontrado');
  }

  res.json(usuario);
};

export const crearUsuario = (req, res) => {
  const nuevoUsuario = usuariosData.crear(req.body);
  res.status(201).json(nuevoUsuario);
};

export const actualizarUsuario = (req, res) => {
  const { id } = req.params;
  const usuarioActualizado = usuariosData.actualizar(id, req.body);

  if (!usuarioActualizado) {
    throw ApiError.notFound('Usuario no encontrado');
  }

  res.json(usuarioActualizado);
};

export const eliminarUsuario = (req, res) => {
  const { id } = req.params;
  const eliminado = usuariosData.eliminar(id);

  if (!eliminado) {
    throw ApiError.notFound('Usuario no encontrado');
  }

  res.status(204).end();
};

