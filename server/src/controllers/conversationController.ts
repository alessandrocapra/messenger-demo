import { Request, Response } from 'express'
import { createConversationSchema } from '../schemas/conversationSchema.js';
import prisma from '../db/prisma.js';

export const createConversation = async (req: Request, res: Response) => {
  try {
    const parsedData = createConversationSchema.safeParse(req.body);
    if (!parsedData.success) {
      const errorMessage = parsedData.error.errors[0].message;
      res.status(400).json({ message: errorMessage });
      return;
    }

    const { participantIds, isGroup, groupName } = parsedData.data;

    const authenticatedUserId = req.user?.id;
    if (!authenticatedUserId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    if (participantIds.includes(authenticatedUserId)) {
      res.status(400).json({ message: "Authenticated user should not be in participantIds" });
      return;
    }

    const participants = await prisma.user.findMany({
      where: {
        id: {
          in: [...participantIds, authenticatedUserId]
        }
      }
    })

    if (participants.length !== participantIds.length + 1) {
      res.status(400).json({ message: "One or more participant IDs are invalid" });
      return;
    }

    const conversation = await prisma.conversation.create({
      data: {
        isGroup,
        groupName: isGroup ? groupName : null,
        participants: {
          create: participants.map(participant => ({ userId: participant.id }))
        }
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                email: true
              }
            }
          }
        }
      }
    })

    res.status(201).json({
      message: "Conversation created successfully",
      conversation
    });
  } catch (error) {
    console.error("Error creating conversation:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

