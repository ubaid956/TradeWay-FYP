import { Server } from 'socket.io';
import { socketAuth } from '../../../../Freelancer/Upwork/Smart Daily/server/middleware/auth.js';
import Message from '../../../../Freelancer/Upwork/Smart Daily/server/models/Message.js';

const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST']
    }
  });

  io.use(socketAuth).on('connection', (socket) => {
    console.log(`User connected: ${socket.user._id}`);

    // Join user to their groups
    socket.on('joinGroups', async () => {
      const groups = socket.user.groups || [];
      groups.forEach(groupId => {
        socket.join(groupId.toString());
        console.log(`User ${socket.user._id} joined group ${groupId}`);
      });
    });

    // Handle new messages
    socket.on('sendMessage', async ({ groupId, text }) => {
      try {
        const message = await Message.create({
          sender: socket.user._id,
          group: groupId,
          text
        });

        const populatedMsg = await Message.populate(message, {
          path: 'sender',
          select: 'name pic currentStatus mood'
        });

        io.to(groupId.toString()).emit('newMessage', populatedMsg);
      } catch (err) {
        console.error('Message send error:', err);
      }
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user._id}`);
    });
  });

  return io;
};

export default initSocket;