import { z } from "zod";

export const createConversationSchema = z.object({
  participantIds: z.array(z.number()),
  isGroup: z.boolean(),
  groupName: z.string().optional()
})
