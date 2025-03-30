import express from "express";
import { createConversation, getUserConversations, sendMessage } from "../controllers/conversationController.js";

const router = express.Router();

router.post('/', createConversation);
router.get('/', getUserConversations);
router.post('/:conversationId/messages', sendMessage);

export default router
