import express from "express";
import { createConversation, getMessages, getUserConversations, sendMessage } from "../controllers/conversationController.js";

const router = express.Router();

router.post('/', createConversation);
router.get('/', getUserConversations);
router.post('/:conversationId/messages', sendMessage);
router.get('/:conversationId/messages', getMessages);

export default router
