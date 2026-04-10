import { verifyToken } from '../utils/jwt.js';
import User from '../models/user.model.js';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: true, message: 'Token no proporcionado' });
    }
    const token = authHeader.split(' ')[1];
    const payload = verifyToken(token);
    const user = await User.findById(payload.id).select('-password');
    if (!user) return res.status(401).json({ error: true, message: 'Usuario no encontrado' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: true, message: 'Token inválido o expirado' });
  }
};
