export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      error: true,
      messages: result.error.issues.map((i) => i.message),
    });
  }
  req.body = result.data;
  next();
};
