import mongoose from 'mongoose';

// Patrón del profesor: valida { body, query, params } completo
export const validate = (schema) => (req, res, next) => {
  try {
    const result = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params
    });
    // Asignar los datos parseados (con defaults de Zod aplicados)
    req.body = result.body ?? req.body;
    next();
  } catch (error) {
    const details = error.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message
    }));
    res.status(400).json({
      error: true,
      message: 'Error de validación',
      details
    });
  }
};

export const validateObjectId = (paramName = 'id') => (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params[paramName])) {
    return res.status(400).json({
      error: true,
      message: `'${paramName}' no es un ID válido`
    });
  }
  next();
};
