import mongoose from 'mongoose';

export const notFound = (req, res, next) => {
  res.status(404).json({
    error: true,
    message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`
  });
};

export const errorHandler = (err, req, res, next) => {
  console.error('❌ Error:', err.message);

  // Validación de Mongoose
  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ error: true, message: 'Error de validación', details });
  }

  // Cast error (ID inválido)
  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({ error: true, message: `Valor inválido para '${err.path}'` });
  }

  // Clave duplicada
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({ error: true, message: `Ya existe un registro con ese '${field}'` });
  }

  // Multer - archivo demasiado grande
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: true, message: 'El archivo excede el tamaño máximo (5MB)' });
  }

  // Multer - campo de archivo inesperado
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      error: true,
      message: `Campo de archivo inesperado: '${err.field}'. Usa el campo 'cover'`
    });
  }

  // Multer - tipo no permitido
  if (err.message === 'Tipo de archivo no permitido') {
    return res.status(415).json({ error: true, message: err.message });
  }

  // JSON mal formado
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: true, message: 'JSON inválido en el cuerpo de la petición' });
  }

  // Error genérico
  res.status(err.status || err.statusCode || 500).json({
    error: true,
    message: err.message || 'Error interno del servidor'
  });
};
