// ./src/app/api/generate-summary/route.ts

import { NextResponse } from "next/server";
import { z } from "zod";
import { myQueue } from "~/server/api/reasoning_bots/bull_mq_process";

// We accept a sessionId, optionally any extra instructions
const GenerateSummarySchema = z.object({
  sessionId: z.string().uuid(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId } = GenerateSummarySchema.parse(body);

    // Add a new job to the queue, specifying our new "generateSummary" job
    const job = await myQueue.add("generateSummary", {
      sessionId,
    });

    return NextResponse.json({
      success: true,
      jobId: job.id, // let the client poll for completion
    });
  } catch (error) {
    console.error("Error spawning summary job:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 },
    );
  }
}
