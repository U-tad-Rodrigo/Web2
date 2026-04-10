import Room from '../../models/room.model.js';
import Message from '../../models/message.model.js';

export const registerRoomHandlers = (io, socket, onlineUsers) => {
  // room:join
  socket.on('room:join', async ({ roomId }) => {
    try {
      if (socket.rooms.has(roomId)) return;

      const room = await Room.findById(roomId);
      if (!room) return socket.emit('error', { message: 'Sala no encontrada' });

      socket.join(roomId);

      // Historial de mensajes (últimos 50)
      const messages = await Message.find({ room: roomId })
        .populate('user', 'username')
        .sort({ createdAt: 1 })
        .limit(50);

      // Usuarios online en esta sala (deduplicados por userId)
      const socketsInRoom = await io.in(roomId).fetchSockets();
      const userIdsInRoom = [...new Set(socketsInRoom.map((s) => String(s.user._id)))];
      const usersInRoom = userIdsInRoom
        .map((id) => onlineUsers.get(id))
        .filter(Boolean);

      socket.emit('room:joined', { room, messages, users: usersInRoom });

      // Notificar al resto de la sala
      socket.to(roomId).emit('room:user-joined', {
        user: { _id: socket.user._id, username: socket.user.username },
      });
    } catch (err) {
      socket.emit('error', { message: err.message });
    }
  });

  // room:leave
  socket.on('room:leave', ({ roomId }) => {
    try {
      socket.leave(roomId);
      socket.to(roomId).emit('room:user-left', {
        user: { _id: socket.user._id, username: socket.user.username },
      });
    } catch (err) {
      socket.emit('error', { message: err.message });
    }
  });
};
