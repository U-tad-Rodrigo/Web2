const checkRol = (requiredRole) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Usuario no autenticado' });
  }

  if (req.user.role !== requiredRole) {
    return res.status(403).json({ message: 'No tienes permisos para esta accion' });
  }

  return next();
};

export default checkRol;

