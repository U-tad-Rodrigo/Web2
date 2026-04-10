import { Router } from 'express';
import User from '../models/user.model.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { signToken } from '../utils/jwt.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: true, message: 'username, email y password son requeridos' });
    }
    const exists = await User.findOne({ $or: [{ email }, { username }] });
    if (exists) {
      return res.status(409).json({ error: true, message: 'El email o username ya está en uso' });
    }
    const hashed = await hashPassword(password);
    const user = await User.create({ username, email, password: hashed });
    const token = signToken({ id: user._id, username: user.username });
    res.status(201).json({ token, user });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: true, message: 'email y password son requeridos' });
    }
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: true, message: 'Credenciales inválidas' });
    const valid = await comparePassword(password, user.password);
    if (!valid) return res.status(401).json({ error: true, message: 'Credenciales inválidas' });
    const token = signToken({ id: user._id, username: user.username });
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

export default router;
