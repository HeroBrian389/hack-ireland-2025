import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const conversationRouter = createTRPCRouter({
  addMessage: publicProcedure
    .input(
      z.object({
        conversationId: z.string(),
        sender: z.enum(["user", "assistant", "system"]),
        messageText: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // For now, we'll just log the message
      // In a real implementation, you would save this to your database
      console.log("Message saved:", {
        conversationId: input.conversationId,
        sender: input.sender,
        messageText: input.messageText,
        timestamp: new Date(),
      });

      return {
        success: true,
      };
    }),
}); 