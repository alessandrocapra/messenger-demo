import { Request, Response } from 'express'
import { createConversationSchema } from '../schemas/conversationSchema.js';
import prisma from '../db/prisma.js';
import { Server } from 'socket.io';

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
      data: conversation
    });
  } catch (error) {
    console.error("Error creating conversation:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export const getUserConversations = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const take = Math.min(Number(req.query.take) || 10, 50);
    const skip = Math.max(Number(req.query.skip) || 0, 0);

    const [conversations, total] = await prisma.$transaction([
      prisma.conversation.findMany({
        where: { participants: { some: { userId } } },
        include: {
          participants: { select: { user: { select: { id: true, email: true } } } },
          messages: { orderBy: { createdAt: 'desc' }, take: 1 }
        },
        orderBy: { createdAt: 'desc' },
        take,
        skip
      }),
      prisma.conversation.count({ where: { participants: { some: { userId } } } })
    ]);

    const mappedConversations = conversations.map(conversation => {
      const flattenedUsers = conversation.participants.flatMap((participant) =>
        participant.user
      )
      const updatedAt = conversation.messages[0]?.createdAt || conversation.createdAt
      const lastMessage = conversation.messages[0]
        ? {
          content: conversation.messages[0].content,
          sentAt: conversation.messages[0].createdAt,
          senderId: conversation.messages[0].senderId
        }
        : null;

      // remove messages from the response
      const { messages, ...rest } = conversation

      return {
        ...rest,
        updatedAt,
        lastMessage,
        participants: flattenedUsers
      }
    })

    res.status(200).json({ message: "Conversations retrieved successfully", data: mappedConversations, pagination: { take, skip, total } });
  } catch (error) {
    console.error("Error retrieving conversations:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export const sendMessage = async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params
    const { content } = req.body
    const userId = req.user?.id
    const io = req.app.get('io') as Server;

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    if (typeof content !== "string" || content.trim().length === 0) {
      res.status(400).json({ message: "Message content is required" });
      return;
    }

    const result = await prisma.$transaction(async (prisma) => {
      const conversation = await prisma.conversation.findFirst({
        where: {
          id: Number(conversationId),
          participants: { some: { userId } }
        },
      });

      if (!conversation) {
        throw new Error("Conversation not found or user is not a participant");
      }

      const newMessage = await prisma.message.create({
        data: {
          content,
          senderId: userId,
          conversationId: Number(conversationId)
        },
        include: {
          sender: {
            select: {
              email: true
            }
          }
        }
      });

      const { sender, ...rest } = newMessage;
      const responseMessage = {
        ...rest,
        senderEmail: newMessage.sender.email
      };

      return responseMessage;
    });

    try {
      io.to(`conversation:${conversationId}`).emit('new-message', result);
    } catch (socketError) {
      console.error('Socket.IO emit error:', socketError);
    }

    res.status(201).json({ message: "Message sent successfully", data: result });
  } catch (error) {
    console.error("Error sending message:", error);
    if (error instanceof Error && error.message === "Conversation not found or user is not a participant") {
      res.status(403).json({ message: error.message });
      return;

    }
    res.status(500).json({ message: "Internal server error" });
  }
}

export const getMessages = async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params
    const userId = req.user?.id
    const take = Math.min(Number(req.query.take) || 10, 50);
    const skip = Math.max(Number(req.query.skip) || 0, 0);


    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const participant = await prisma.participant.findFirst({
      where: {
        userId: Number(userId),
        conversationId: Number(conversationId)
      }
    });

    if (!participant) {
      res.status(404).json({ message: "Conversation not found or user not part of the conversation" });
      return;
    }

    const [messages, totalCount] = await prisma.$transaction([
      prisma.message.findMany({
        where: { conversationId: Number(conversationId) },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
        include: { sender: { select: { email: true } } }
      }),
      prisma.message.count({ where: { conversationId: Number(conversationId) } })
    ]);

    res.status(200).json({
      message: "Messages retrieved successfully", data: messages,
      pagination: {
        take,
        skip,
        total: totalCount
      }
    });
  } catch (error) {
    console.error("Error retrieving messages:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
