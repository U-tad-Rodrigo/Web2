import { verifyToken } from '../utils/jwt.js';
import User from '../models/user.model.js';
import { registerRoomHandlers } from './handlers/room.handler.js';
import { registerChatHandlers } from './handlers/chat.handler.js';

// userId (string) -> { _id, username, connections }
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
    const userId = String(socket.user._id);
    const { username } = socket.user;
    const isFirstConnection = !onlineUsers.has(userId);

    // Enviar lista actual ANTES de registrar, para no aparecer en la propia lista
    socket.emit('users:online', Array.from(onlineUsers.values()).map(({ _id, username: u }) => ({ _id, username: u })));

    // Registrar — clave por userId evita duplicados por múltiples pestañas
    const connections = (onlineUsers.get(userId)?.connections ?? 0) + 1;
    onlineUsers.set(userId, { _id: userId, username, connections });

    // Notificar solo en la primera conexión del usuario
    if (isFirstConnection) {
      socket.broadcast.emit('user:online', { userId, username });
    }

    // Registrar handlers de sala y chat
    registerRoomHandlers(io, socket, onlineUsers);
    registerChatHandlers(io, socket);

    // Desconexión
    socket.on('disconnect', () => {
      const entry = onlineUsers.get(userId);
      if (!entry) return;
      if (entry.connections <= 1) {
        onlineUsers.delete(userId);
        socket.broadcast.emit('user:offline', { userId, username });
      } else {
        onlineUsers.set(userId, { ...entry, connections: entry.connections - 1 });
      }
    });
  });
};
