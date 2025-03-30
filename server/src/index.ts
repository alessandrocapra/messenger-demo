import dotenv from 'dotenv'
dotenv.config()

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from 'helmet';
import { createServer } from "node:http";
import { Server } from "socket.io";

import userRoutes from "./routes/userRoutes.js";
import { errorHandler } from './middlewares/error.js';
import conversationRoutes from './routes/conversationRoutes.js';
import { verifyToken } from './middlewares/authMiddleware.js';

const port = process.env.PORT || 8080;
const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(errorHandler);

app.set('io', io);

app.use('/auth', userRoutes);
app.use('/conversations', verifyToken, conversationRoutes);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join conversation rooms
  socket.on('join-conversation', (conversationId) => {
    socket.join(`conversation:${conversationId}`);
    console.log(`User ${socket.id} joined conversation ${conversationId}`);
  });

  socket.on('send-message', (messageData) => {
    io.to(`conversation:${messageData.conversationId}`).emit('new-message', messageData);
  });

  socket.on('typing', (data) => {
    socket.to(`conversation:${data.conversationId}`).emit('user-typing', {
      userId: data.userId,
      conversationId: data.conversationId
    });
  });

  socket.on('stop-typing', (data) => {
    socket.to(`conversation:${data.conversationId}`).emit('user-stop-typing', {
      userId: data.userId,
      conversationId: data.conversationId
    });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: "Internal Server Error" });
});


server.listen(port, () => console.log(`Server is running on port ${port}`));
