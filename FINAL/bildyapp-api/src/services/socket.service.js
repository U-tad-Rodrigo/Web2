import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

let io = null;

const getHandshakeToken = (socket) => {
  const authToken = socket.handshake.auth?.token;
  if (authToken) return authToken;

  const header = socket.handshake.headers?.authorization;
  if (header?.startsWith('Bearer ')) return header.split(' ')[1];

  return null;
};

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.SOCKET_CORS_ORIGIN || '*',
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
    }
  });

  io.use(async (socket, next) => {
    try {
      const token = getHandshakeToken(socket);
      if (!token) return next(new Error('Token no proporcionado'));
      if (!process.env.JWT_SECRET) return next(new Error('JWT_SECRET no configurado'));

      const payload = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(payload.id).select('_id email role company deleted');

      if (!user || user.deleted) return next(new Error('Usuario no autorizado'));
      if (!user.company) return next(new Error('Usuario sin empresa asignada'));

      socket.user = user;
      socket.companyRoom = user.company.toString();
      return next();
    } catch {
      return next(new Error('Token invalido'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(socket.companyRoom);
    socket.emit('socket:ready', {
      userId: socket.user._id.toString(),
      company: socket.companyRoom
    });
  });

  return io;
};

export const getSocket = () => io;

export const emitToCompany = (companyId, event, payload) => {
  if (!io || !companyId) return;
  io.to(companyId.toString()).emit(event, payload);
};

