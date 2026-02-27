import { ZodError } from 'zod';
import mongoose from 'mongoose';

// Patrón del profesor: valida { body, query, params } completo
export const validate = (schema) => (req, res, next) => {
  try {
    const result = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params
    });

    // body: sobreescribir con resultado coercionado/parseado de Zod
    if (result?.body !== undefined) req.body = result.body;
    // query: guardar en req.parsedQuery los valores coercionados (req.query es solo lectura)
    if (result?.query !== undefined) req.parsedQuery = result.query;

    return next();
  } catch (error) {
    if (error instanceof ZodError) {
      const details = error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message
      }));
      return res.status(400).json({
        error: true,
        message: 'Error de validación',
        details
      });
    }
    return next(error);
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
