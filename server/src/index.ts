import dotenv from 'dotenv'
dotenv.config()

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from 'helmet';

import userRoutes from "./routes/userRoutes.js";
import { errorHandler } from './middlewares/error.js';

const port = process.env.PORT || 8080;
const app = express();

app.use(express.json());
app.use(cors());
app.use(helmet());

app.use(errorHandler);

app.use('/auth', userRoutes);

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: "Internal Server Error" });
});


app.listen(port, () => console.log(`Server is running on port ${port}`));
