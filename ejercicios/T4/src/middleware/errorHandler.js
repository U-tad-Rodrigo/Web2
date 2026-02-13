// Middleware: Manejo centralizado de errores
export const errorHandler = (err, req, res, _next) => {
  console.error('[ERROR]', err);

  if (err.name === 'ZodError') {
    return res.status(400).json({ error: 'Validación fallida', detalles: err.errors });
  }

  if (err.status) {
    return res.status(err.status).json({ error: err.message });
  }

  res.status(500).json({ error: 'Error interno del servidor' });
};
