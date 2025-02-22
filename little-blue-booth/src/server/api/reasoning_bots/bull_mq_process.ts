// bull.ts

import { Queue, Worker, Job } from "bullmq";
import { query_chat_bot } from "./analyse_data";
import { db } from "~/server/db";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const QUEUE_NAME = "analysisQueue";

const connection = {
  host: process.env.REDIS_HOST ?? "localhost",
  port: parseInt(process.env.REDIS_PORT ?? "6379"),
  // Add connection retry strategy
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
};

export const myQueue = new Queue(QUEUE_NAME, { 
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 1000, // Keep last 1000 completed jobs
    },
    removeOnFail: {
      age: 24 * 3600 * 7, // Keep failed jobs for 7 days
      count: 1000,
    }
  }
});

interface JobData {
  conversation: string;
  processed?: string; // or store structured data
  sessionId: string; // Required for database operations
}

interface ExtractedInfo {
  personalInfo: {
    name: string | null;
    dateOfBirth: string | null;
    age: number | null;
  };
  vitalSigns: {
    bloodPressure: { systolic: number | null; diastolic: number | null; } | null;
    heartRate: number | null;
    bloodOxygen: number | null;
  };
  symptoms: string[] | null;
  medications: string[] | null;
}

export const worker = new Worker<JobData>(
  QUEUE_NAME,
  async (job: Job<JobData>) => {
    console.log(`Processing job ${job.id} of type ${job.name}`);
    
    // Validate sessionId is present
    if (!job.data.sessionId) {
      throw new Error(`Job ${job.id} is missing required sessionId`);
    }

    // Verify session exists before processing
    const session = await db.session.findUnique({
      where: { id: job.data.sessionId }
    });

    if (!session) {
      throw new Error(`Session ${job.data.sessionId} not found for job ${job.id}`);
    }

    try {
      // Switch by job name or define a per-bot function map
      switch (job.name) {
        case "roughOverview":
          return await runRoughOverview(job);

        case "extractHealthMetrics":
          return await runHealthMetricsExtraction(job);

        case "checkInformationCompleteness":
          return await runInformationCompletenessCheck(job);

        default:
          console.log(`Unknown job name ${job.name}`);
          throw new Error(`Unknown job name ${job.name}`);
      }
    } catch (error) {
      console.error(`Error processing job ${job.id}:`, error);
      throw error; // Re-throw to trigger retry mechanism
    }
  },
  {
    connection,
    concurrency: 50,
    limiter: {
      max: 100, // Maximum number of jobs processed in duration
      duration: 1000, // Duration in milliseconds for rate limiting
    },
  }
);

// Add error handling
worker.on('error', err => {
  console.error('Worker error:', {
    error: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined
  });
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, {
    jobName: job?.name,
    sessionId: job?.data.sessionId,
    error: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined
  });
});

worker.on('completed', job => {
  console.log(`Job ${job.id} completed successfully`, {
    jobName: job.name,
    sessionId: job.data.sessionId
  });
});

// Another specialized function
async function runRoughOverview(job: Job<JobData>) {
  // Pretend we do a different AI call:
  const res = await query_chat_bot(job.data.conversation);
  await job.updateData({
    ...job.data,
    processed: `[Background Analysis]: ${res}`,
  });
}

// New function to extract health metrics
async function runHealthMetricsExtraction(job: Job<JobData>) {
  if (!job.data.sessionId) {
    throw new Error("sessionId is required for health metrics extraction");
  }

  try {
    // Retrieve existing metrics (for logging or incremental updates)
    const existingMarkers = await db.healthMarker.findMany({
      where: {
        sessionId: job.data.sessionId,
        markerType: {
          in: ["bmi", "height", "weight", "heartRate", "bloodPressure", "bloodOxygen"]
        }
      }
    });

    console.log("existingMarkers", existingMarkers);

    // Query the AI to extract metrics
    const prompt = `Extract the following health metrics from the conversation, responding in a strict JSON format.
{
  "bmi": number | null,
  "height": number | null, // in cm
  "weight": number | null, // in kg
  "heartRate": number | null, // in bpm
  "bloodPressure": { "systolic": number | null, "diastolic": number | null } | null,
  "bloodOxygen": number | null // percentage
}

Conversation transcript:
${job.data.conversation}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You are a precise medical data extraction system. Only extract values that are explicitly stated in the conversation. Do not infer or calculate values unless explicitly mentioned. Respond with a JSON object containing the following fields: bmi (number|null), height (number|null), weight (number|null), heartRate (number|null), bloodPressure ({systolic: number|null, diastolic: number|null}|null), bloodOxygen (number|null)" },
        { role: "user", content: prompt }
      ]
    });

    if (!completion.choices[0]?.message?.content) {
      throw new Error("No content in OpenAI response");
    }

    const metrics = JSON.parse(completion.choices[0].message.content) as {
      bmi: number | null;
      height: number | null;
      weight: number | null;
      heartRate: number | null;
      bloodPressure: { systolic: number | null; diastolic: number | null } | null;
      bloodOxygen: number | null;
    };

    console.log("metrics", metrics);

    // Store each metric in the database if not null and not already stored
    const existingTypes = new Set(existingMarkers.map(m => m.markerType));
    const results = [];

    for (const [type, value] of Object.entries(metrics)) {
      if (value === null || existingTypes.has(type)) continue;

      if (type === "bloodPressure" && typeof value === "object" && value !== null) {
        const bpValue = value as { systolic: number | null; diastolic: number | null };
        if (bpValue.systolic !== null && bpValue.diastolic !== null) {
          const marker = await db.healthMarker.create({
            data: {
              sessionId: job.data.sessionId,
              markerType: "bloodPressure",
              data: JSON.stringify({
                systolic: bpValue.systolic,
                diastolic: bpValue.diastolic
              })
            }
          });
          results.push(marker);
        }
      } else if (typeof value === "number") {
        const marker = await db.healthMarker.create({
          data: {
            sessionId: job.data.sessionId,
            markerType: type,
            data: JSON.stringify({ value })
          }
        });
        results.push(marker);
      }
    }

    return {
      processed: true,
      metrics: results
    };
  } catch (error) {
    console.error("Error in health metrics extraction:", error);
    throw error;
  }
}

// New function to check if we have enough information for final analysis
async function runInformationCompletenessCheck(job: Job<JobData>) {
  try {
    // First, gather all health markers for this session
    const healthMarkers = await db.healthMarker.findMany({
      where: {
        sessionId: job.data.sessionId
      }
    });

    // Extract basic information from the conversation
    const prompt = `Extract ONLY explicitly mentioned information from this conversation. Do not make assumptions or recommendations.
    Respond in this JSON format:
    {
      "personalInfo": {
        "name": string | null,
        "dateOfBirth": string | null,
        "age": number | null
      },
      "vitalSigns": {
        "bloodPressure": { "systolic": number | null, "diastolic": number | null } | null,
        "heartRate": number | null,
        "bloodOxygen": number | null
      },
      "symptoms": string[] | null,
      "medications": string[] | null
    }

    Conversation transcript:
    ${job.data.conversation}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You are an information extraction system. Only extract information that is explicitly stated in the conversation. Do not infer, analyze, or make recommendations." },
        { role: "user", content: prompt }
      ]
    });

    if (!completion.choices[0]?.message?.content) {
      throw new Error("No content in OpenAI response");
    }

    const extractedInfo = JSON.parse(completion.choices[0].message.content) as ExtractedInfo;

    console.log("extractedInfo", extractedInfo);
    
    // Simple check if we have enough information to proceed
    const hasEnoughInformation = Boolean(
      ((extractedInfo.personalInfo?.name ?? null) && (extractedInfo.personalInfo?.dateOfBirth ?? null)) ??
      (healthMarkers && healthMarkers.length > 0) ??
      ((extractedInfo.symptoms ?? null) && (extractedInfo.symptoms?.length ?? 0) > 0) ??
      ((extractedInfo.medications ?? null) && (extractedInfo.medications?.length ?? 0) > 0)
    );

    console.log("hasEnoughInformation", hasEnoughInformation);

    // Verify session still exists before creating analysis status
    const session = await db.session.findUnique({
      where: { id: job.data.sessionId }
    });

    if (!session) {
      throw new Error(`Session ${job.data.sessionId} no longer exists`);
    }
    
    // Create analysis status with transaction to ensure consistency
    const result = await db.$transaction(async (tx) => {
      const missingInfo = [
        !extractedInfo.personalInfo?.name && "Name",
        !extractedInfo.personalInfo?.dateOfBirth && "Date of Birth",
        !extractedInfo.vitalSigns?.bloodPressure && "Blood Pressure",
        !extractedInfo.vitalSigns?.heartRate && "Heart Rate",
        !extractedInfo.symptoms && "Symptoms",
        !extractedInfo.medications && "Current Medications"
      ].filter(Boolean);

      const data: { 
        sessionId: string;
        hasEnoughInformation?: boolean;
        missingCriticalInfo?: string;
        recommendedNextSteps?: string;
        urgencyLevel?: string;
        reasoning?: string;
      } = {
        sessionId: job.data.sessionId
      };

      if (hasEnoughInformation !== undefined) {
        data.hasEnoughInformation = hasEnoughInformation;
        data.urgencyLevel = "low";
        data.reasoning = "Information gathering in progress";
      }

      if (missingInfo.length > 0) {
        data.missingCriticalInfo = JSON.stringify(missingInfo);
      }

      if (hasEnoughInformation === false) {
        data.recommendedNextSteps = JSON.stringify([]);
      }

      return await tx.analysisStatus.create({ data });
    });

    return {
      processed: true,
      analysis: result
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error in information completeness check:", {
      jobId: job.id,
      sessionId: job.data.sessionId,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    });
    throw new Error(`Information completeness check failed: ${errorMessage}`);
  }
}


