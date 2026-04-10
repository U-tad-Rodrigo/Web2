import jwt from 'jsonwebtoken';

if (!process.env.JWT_SECRET) {
  throw new Error('La variable de entorno JWT_SECRET no está definida');
}

const SECRET = process.env.JWT_SECRET;
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export const signToken = (payload) => jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });
export const verifyToken = (token) => jwt.verify(token, SECRET);

