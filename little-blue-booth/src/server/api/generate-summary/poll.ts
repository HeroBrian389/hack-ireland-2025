// ./src/app/api/generate-summary/poll.ts
// (You could also place this logic in "reasoningRouter" or "pollingrouter" TRPC code)

import { NextResponse } from "next/server";
import { z } from "zod";
import { myQueue } from "~/server/api/reasoning_bots/bull_mq_process";

const PollSchema = z.object({
  jobId: z.string(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { jobId } = PollSchema.parse(body);

    const job = await myQueue.getJob(jobId);
    if (!job) {
      return NextResponse.json({ status: "not_found" }, { status: 404 });
    }

    const state = await job.getState();
    if (state !== "completed") {
      return NextResponse.json({ status: state });
    }

    // If completed, the result is in job.returnvalue or job.data
    const returnValue = job.returnvalue || {};
    // e.g., { processed: true, summaryContent: "...markdown..." }

    return NextResponse.json({
      status: "completed",
      summaryContent: returnValue.summaryContent ?? null,
    });
  } catch (error) {
    console.error("Polling error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
