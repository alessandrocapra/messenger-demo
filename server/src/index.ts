import dotenv from 'dotenv'
dotenv.config()

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from 'helmet';
import { createServer } from "node:http";

import userRoutes from "./routes/userRoutes.js";
import { errorHandler } from './middlewares/error.js';
import conversationRoutes from './routes/conversationRoutes.js';
import { verifyToken } from './middlewares/authMiddleware.js';
import { setupSocketIO } from './socket/index.js';

const port = process.env.PORT || 8080;
const app = express();
const server = createServer(app);

app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(errorHandler);

const io = setupSocketIO(server);
app.set('io', io);

app.use('/auth', userRoutes);
app.use('/conversations', verifyToken, conversationRoutes);

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: "Internal Server Error" });
});


server.listen(port, () => console.log(`Server is running on port ${port}`));
