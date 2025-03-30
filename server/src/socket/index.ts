import { Server } from "socket.io";
import jwt from 'jsonwebtoken';
import { Server as HttpServer } from 'http';

export function setupSocketIO(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST']
    }
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication error: Token missing'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: number };
      socket.data.userId = decoded.userId;
      socket.join(`user:${decoded.userId}`);
      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log('User connected:', socket.data.userId);

    socket.on('join-conversation', (conversationId) => {
      socket.join(`conversation:${conversationId}`);
      console.log(`User ${socket.data.userId} joined conversation ${conversationId}`);
    });

    socket.on('send-message', (messageData) => {
      io.to(`conversation:${messageData.conversationId}`).emit('new-message', messageData);
    });

    socket.on('typing', (data) => {
      socket.to(`conversation:${data.conversationId}`).emit('user-typing', {
        userId: socket.data.userId,
        conversationId: data.conversationId
      });
    });

    socket.on('stop-typing', (data) => {
      socket.to(`conversation:${data.conversationId}`).emit('user-stop-typing', {
        userId: socket.data.userId,
        conversationId: data.conversationId
      });
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });

  return io;
}
