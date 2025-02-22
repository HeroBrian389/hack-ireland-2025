import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { addJobs } from "./bull_mq_process";

// Define the conversation message structure
const ConversationMessage = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

// Define the conversation input schema
const ConversationInput = z.array(ConversationMessage);

export const reasoningRouter = createTRPCRouter({
  analyzeConversation: publicProcedure
    .input(ConversationInput)
    .mutation(async ({ input }) => {
      try {
        // Process the conversation here
        // This is where you'd add your reasoning logic
        
        await addJobs();
        return {
          analysis: "testing",
          // Add more response fields as needed
        };
      } catch (error) {
        throw new Error("Failed to analyze conversation");
      }
    }),
});
