// Middleware: Manejo centralizado de errores
export const errorHandler = (err, req, res, _next) => {
  console.error('[ERROR]', err);

  // Error de validación con Zod
  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: 'Validación fallida',
      detalles: err.errors
    });
  }

  // Error de sintaxis JSON
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: 'JSON inválido',
      mensaje: 'El cuerpo de la petición contiene JSON mal formado'
    });
  }

  // Errores personalizados con código de estado
  if (err.status) {
    return res.status(err.status).json({
      error: err.message || 'Error en la petición'
    });
  }

  // Errores HTTP comunes
  const statusCode = err.statusCode || err.code || 500;

  switch (statusCode) {
    case 400:
      return res.status(400).json({
        error: err.message || 'Petición incorrecta'
      });

    case 401:
      return res.status(401).json({
        error: err.message || 'No autorizado'
      });

    case 403:
      return res.status(403).json({
        error: err.message || 'Acceso prohibido'
      });

    case 404:
      return res.status(404).json({
        error: err.message || 'Recurso no encontrado'
      });

    case 409:
      return res.status(409).json({
        error: err.message || 'Conflicto con el estado actual'
      });

    case 429:
      return res.status(429).json({
        error: err.message || 'Demasiadas peticiones'
      });

    default:
      return res.status(500).json({
        error: 'Error interno del servidor',
        mensaje: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
  }
};
