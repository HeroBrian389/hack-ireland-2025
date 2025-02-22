import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { myQueue } from "../reasoning_bots/bull_mq_process";

export const pollingrouter = createTRPCRouter({
  polling: publicProcedure
    .query(async () => {
        const completed = await myQueue.getCompleted();
        return completed.map(job => ({
          id: job.id,
          data: job.data
        }));
    }),
});
