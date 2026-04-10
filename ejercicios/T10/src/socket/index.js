import { verifyToken } from '../utils/jwt.js';
import User from '../models/user.model.js';
import { registerRoomHandlers } from './handlers/room.handler.js';
import { registerChatHandlers } from './handlers/chat.handler.js';

// socketId -> { _id, username }
const onlineUsers = new Map();

export const setupSocket = (io) => {
  // Middleware de autenticación para WebSocket
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Token requerido'));
      const payload = verifyToken(token);
      const user = await User.findById(payload.id).select('-password');
      if (!user) return next(new Error('Usuario no encontrado'));
      socket.user = user;
      next();
    } catch {
      next(new Error('Token inválido'));
    }
  });

  io.on('connection', (socket) => {
    const { _id, username } = socket.user;

    // Registrar usuario online
    onlineUsers.set(socket.id, { _id, username });

    // Notificar a todos que este usuario se conectó
    socket.broadcast.emit('user:online', { userId: _id, username });

    // Enviar lista de usuarios online al nuevo socket
    socket.emit('users:online', Array.from(onlineUsers.values()));

    // Registrar handlers de sala y chat
    registerRoomHandlers(io, socket, onlineUsers);
    registerChatHandlers(io, socket);

    // Desconexión
    socket.on('disconnect', () => {
      onlineUsers.delete(socket.id);
      socket.broadcast.emit('user:offline', { userId: _id, username });
    });
  });
};
