export const handleHttpError = (res, message = 'Error interno', code = 500) => {
  res.status(code).json({
    error: true,
    message
  });
};
