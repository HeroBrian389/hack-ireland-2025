import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { myQueue } from "../reasoning_bots/bull_mq_process";
import type { Job } from "bullmq";

interface JobData {
  processed: boolean;
  data: string;
}

export const pollingrouter = createTRPCRouter({
  polling: publicProcedure
    .input(
      z.object({
        workerIds: z.array(z.string()).optional(),
      })
    )
    .query(async ({ input }) => {
      const completed = await myQueue.getCompleted() as Job<JobData>[];
      const workerIds = input.workerIds ?? [];
      const filteredJobs = workerIds.length > 0
        ? completed.filter(job => workerIds.includes(job.id))
        : completed;
      
      return filteredJobs.map(job => ({
        id: job.id,
        data: {
          processed: job.returnvalue?.processed ?? false,
          data: job.returnvalue?.data ?? null as any
        }
      }));
    }),
});
