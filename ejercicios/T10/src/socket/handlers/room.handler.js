import Room from '../../models/room.model.js';
import Message from '../../models/message.model.js';

export const registerRoomHandlers = (io, socket, onlineUsers) => {
  // room:join
  socket.on('room:join', async ({ roomId }) => {
    try {
      const room = await Room.findById(roomId);
      if (!room) return socket.emit('error', { message: 'Sala no encontrada' });

      socket.join(roomId);

      // Historial de mensajes (últimos 50)
      const messages = await Message.find({ room: roomId })
        .populate('user', 'username')
        .sort({ createdAt: 1 })
        .limit(50);

      // Usuarios online en esta sala
      const socketsInRoom = await io.in(roomId).fetchSockets();
      const usersInRoom = socketsInRoom
        .map((s) => onlineUsers.get(s.id))
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
    socket.leave(roomId);
    socket.to(roomId).emit('room:user-left', {
      user: { _id: socket.user._id, username: socket.user.username },
    });
  });
};
