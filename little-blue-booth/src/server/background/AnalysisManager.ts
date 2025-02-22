// server/background/analysisManager.ts

import { myQueue } from "~/server/api/reasoning_bots/bull_mq_process";
import { v4 as uuidv4 } from "uuid";

/**
 * The shape of a single background analysis module.
 */
interface AnalysisModule {
  name: string; // e.g. "diagnosticBot"
  description?: string; // optional, for clarity
  // Possibly include more config for concurrency, etc.
}

/**
 * For demonstration, a sample list of modules to run.
 * In a real setup, you can separate them into their own files.
 */
const analysisModules: AnalysisModule[] = [
  { name: "roughOverview" },
  { name: "extractDetails" }
];

export async function createJobsFromConversation(
  conversationText: string
): Promise<string[]> {
  const jobIds: string[] = [];

  for (const analysisModule of analysisModules) {
    // Each module name can be used as the job's name or type
    const job = await myQueue.add(analysisModule.name, {
      // The data that the bot needs; you might shape this differently
      conversation: conversationText,
    });

    if (job.id) {
      jobIds.push(job.id);
    }
  }

  return jobIds;
}
