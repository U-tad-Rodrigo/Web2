import { Router } from 'express';
import Room from '../models/room.model.js';
import Message from '../models/message.model.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// GET /api/rooms
router.get('/', async (_req, res) => {
  try {
    const rooms = await Room.find().populate('createdBy', 'username').sort({ createdAt: -1 });
    res.json({ rooms });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

// POST /api/rooms
router.post('/', async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: true, message: 'name es requerido' });
    const exists = await Room.findOne({ name });
    if (exists) return res.status(409).json({ error: true, message: 'Ya existe una sala con ese nombre' });
    const room = await Room.create({ name, description, createdBy: req.user._id });
    await room.populate('createdBy', 'username');
    res.status(201).json({ room });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

// GET /api/rooms/:id/messages
router.get('/:id/messages', async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ error: true, message: 'Sala no encontrada' });
    const messages = await Message.find({ room: req.params.id })
      .populate('user', 'username')
      .sort({ createdAt: 1 })
      .limit(50);
    res.json({ messages });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

export default router;
