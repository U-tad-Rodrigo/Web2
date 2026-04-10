import Message from '../../models/message.model.js';

export const registerChatHandlers = (io, socket) => {
  // chat:message
  socket.on('chat:message', async ({ roomId, content }) => {
    try {
      if (!roomId || !content?.trim()) return;

      const message = await Message.create({
        room: roomId,
        user: socket.user._id,
        content: content.trim(),
      });

      await message.populate('user', 'username');

      io.to(roomId).emit('chat:message', {
        _id: message._id,
        content: message.content,
        user: message.user,
        createdAt: message.createdAt,
      });
    } catch (err) {
      socket.emit('error', { message: err.message });
    }
  });

  // chat:typing
  socket.on('chat:typing', ({ roomId }) => {
    if (!roomId) return;
    socket.to(roomId).emit('chat:typing', {
      user: { _id: socket.user._id, username: socket.user.username },
    });
  });
};
