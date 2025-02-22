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

// Define the conversation input schema
const ConversationInput = z.array(ConversationMessage);

interface JobResult {
  jobId: string;
  status: JobState | "not_found";
  data: unknown | null;
}

export const reasoningRouter = createTRPCRouter({
  // 1) Called when the conversation changes (to queue new tasks)
  analyzeConversation: publicProcedure
    .input(ConversationInput)
    .mutation(async ({ input }) => {
      try {
        // Gather user & assistant messages
        const conversationText = input
          .map((msg) => `[${msg.role}]: ${msg.content}`)
          .join("\n");

        // Create tasks
        const workerIds = await createJobsFromConversation(conversationText);

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

      console.log("input.jobIds", input.jobIds);

      for (const jobId of input.jobIds) {
        try {
          const job = await myQueue.getJob(jobId);

          if (!job) {
            results.push({ jobId, status: "not_found", data: null });
            continue;
          }

          const state = await job.getState();
          const data = job.data;

          results.push({
            jobId,
            status: state,
            data: data ?? null,
          });
        } catch (error) {
          results.push({ jobId, status: "not_found", data: null });
        }
      }

      return results;
    }),
});
