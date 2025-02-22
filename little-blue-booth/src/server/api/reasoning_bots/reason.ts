import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { createJobsFromConversation } from "~/server/background/AnalysisManager";
import { myQueue } from "~/server/api/reasoning_bots/bull_mq_process";
import { Job, JobState } from "bullmq";

// Define the conversation message structure
const ConversationMessage = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

type Message = z.infer<typeof ConversationMessage>;

// Define the conversation input schema
const ConversationInput = z.object({
  messages: z.array(ConversationMessage),
  sessionId: z.string(),
});

interface JobData {
  conversation: string;
  sessionId: string;
  processed?: string;
  timestamp?: string;
}

interface JobResult {
  jobId: string;
  status: JobState | "not_found";
  data: unknown;
}

export const reasoningRouter = createTRPCRouter({
  // 1) Called when the conversation changes (to queue new tasks)
  analyzeConversation: publicProcedure
    .input(ConversationInput)
    .mutation(async ({ input }) => {
      try {
        // Extract session ID and messages
        const { sessionId, messages } = input;
        
        // Gather user & assistant messages
        const conversationText = messages
          .map((msg: Message) => `[${msg.role}]: ${msg.content}`)
          .join("\n");

        // Create tasks with session ID
        const workerIds = await createJobsFromConversation(conversationText, sessionId);

        console.log("workerIds", workerIds);

        return {
          workerIds,
        };
      } catch (error) {
        throw new Error("Failed to analyze conversation");
      }
    }),

  // 2) Polling route: pass an array of job IDs, get statuses + results
  pollJobStatus: publicProcedure
    .input(z.object({ jobIds: z.array(z.string()) }))
    .query(async ({ input }) => {
      const results: JobResult[] = [];

      for (const jobId of input.jobIds) {
        try {
          const job = await myQueue.getJob(jobId) as Job<JobData> | null;

          if (!job) {
            results.push({ jobId, status: "not_found", data: null });
            continue;
          }

          const state = await job.getState();
          // Handle unknown state case
          if (state === "unknown") {
            results.push({ jobId, status: "not_found", data: null });
            continue;
          }

          results.push({
            jobId,
            status: state,
            data: job.data ?? null,
          });
        } catch (error) {
          results.push({ jobId, status: "not_found", data: null });
        }
      }

      return results;
    }),
});
