import express from "express";
import { createConversation } from "../controllers/conversationController.js";

const router = express.Router();

router.post('/', createConversation);

export default router
