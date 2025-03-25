import dotenv from 'dotenv'
dotenv.config()

import express from "express";
import userRoutes from "./routes/userRoutes.js";

const port = process.env.PORT;
const app = express();

app.use('/auth', userRoutes);

app.listen(port, () => console.log(`Server is running on port ${port}`));
