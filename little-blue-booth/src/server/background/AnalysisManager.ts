// server/background/analysisManager.ts

import { myQueue } from "~/server/api/reasoning_bots/bull_mq_process";
import { v4 as uuidv4 } from "uuid";

/**
 * The shape of a single background analysis module.
 */
interface AnalysisModule {
  name: string;
  description?: string;
  priority?: number;
}

/**
 * For demonstration, a sample list of modules to run.
 * In a real setup, you can separate them into their own files.
 */
const analysisModules: AnalysisModule[] = [
  { name: "roughOverview", priority: 1 },
  { name: "extractHealthMetrics", priority: 2 },
  { name: "checkInformationCompleteness", priority: 3 }
];

export async function createJobsFromConversation(
  conversationText: string,
  sessionId: string
): Promise<string[]> {
  const jobIds: string[] = [];

  try {
    for (const analysisModule of analysisModules) {
      const job = await myQueue.add(
        analysisModule.name,
        {
          conversation: conversationText,
          sessionId,
          timestamp: new Date().toISOString()
        },
        {
          priority: analysisModule.priority,
          jobId: `${analysisModule.name}-${sessionId}`, // Unique job ID
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000
          }
        }
      );

      if (job.id) {
        jobIds.push(job.id);
        console.log(`Created job ${job.id} for module ${analysisModule.name}`);
      } else {
        console.error(`Failed to create job for module ${analysisModule.name}`);
      }
    }

    return jobIds;
  } catch (error) {
    console.error('Error creating analysis jobs:', error);
    throw new Error(`Failed to create analysis jobs: ${error instanceof Error ? error.message : String(error)}`);
  }
}
