// bull.ts

import { Queue, Worker, Job } from "bullmq";
import { query_chat_bot } from "./analyse_data";
import { db } from "~/server/db";
import OpenAI from "openai";
import { runGoogleFitAnalysis } from "./google_fit_analysis";
import { getFitData } from "~/services/googleFitService";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const QUEUE_NAME = "analysisQueue";

const connection = {
  host: process.env.REDIS_HOST ?? "localhost",
  port: parseInt(process.env.REDIS_PORT ?? "6379"),
};

export const myQueue = new Queue(QUEUE_NAME, { connection });

interface JobData {
  conversation: string;
  processed?: string; // or store structured data
  sessionId?: string; // Add sessionId for database operations
}

export const worker = new Worker<JobData>(
  QUEUE_NAME,
  async (job: Job<JobData>) => {
    // Switch by job name or define a per-bot function map
    switch (job.name) {
      case "roughOverview":
        return runRoughOverview(job);

      case "extractHealthMetrics":
        return runHealthMetricsExtraction(job);

      case "extractGoogleFitData":
        return runGoogleFitAnalysis(job);

      default:
        console.log(`Unknown job name ${job.name}`);
        break;
    }
  },
  {
    connection,
    concurrency: 50,
  },
);

async function runGoogleFitAnalysis(job: Job<JobData>) {
  if (!job.data.sessionId) {
    throw new Error("sessionId is required for Google Fit analysis");
  }

  // Get the session from the database to get userId
  const session = await db.session.findUnique({
    where: { id: job.data.sessionId },
    select: { userId: true },
  });

  if (!session) {
    throw new Error("Session not found");
  }

  const googleFitData = await getFitData(session.userId);

  if (!googleFitData) {
    throw new Error("No Google Fit data found");
  }

  return googleFitData;
}

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
    // First check if metrics already exist for this session
    const existingMarkers = await db.healthMarker.findMany({
      where: {
        sessionId: job.data.sessionId,
        markerType: {
          in: [
            "bmi",
            "height",
            "weight",
            "heartRate",
            "bloodPressure",
            "bloodOxygen",
          ],
        },
      },
    });

    // If we already have all metrics, skip processing
    if (existingMarkers.length >= 6) {
      return {
        skipped: true,
        message: "Health metrics already exist for this session",
      };
    }

    // Query the AI to extract metrics
    const prompt = `Extract the following health metrics from the conversation, responding in a strict JSON format. Only include metrics that are explicitly mentioned:
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
        {
          role: "system",
          content:
            "You are a precise medical data extraction system. Only extract values that are explicitly stated in the conversation. Do not infer or calculate values unless explicitly mentioned. Respond with a JSON object containing the following fields: bmi (number|null), height (number|null), weight (number|null), heartRate (number|null), bloodPressure ({systolic: number|null, diastolic: number|null}|null), bloodOxygen (number|null)",
        },
        { role: "user", content: prompt },
      ],
    });

    if (!completion.choices[0]?.message?.content) {
      throw new Error("No content in OpenAI response");
    }

    const metrics = JSON.parse(completion.choices[0].message.content) as {
      bmi: number | null;
      height: number | null;
      weight: number | null;
      heartRate: number | null;
      bloodPressure: {
        systolic: number | null;
        diastolic: number | null;
      } | null;
      bloodOxygen: number | null;
    };

    // Store each metric in the database if not null and not already stored
    const existingTypes = new Set(existingMarkers.map((m) => m.markerType));
    const results = [];

    for (const [type, value] of Object.entries(metrics)) {
      if (value === null || existingTypes.has(type)) continue;

      if (
        type === "bloodPressure" &&
        typeof value === "object" &&
        value !== null
      ) {
        const bpValue = value as {
          systolic: number | null;
          diastolic: number | null;
        };
        if (bpValue.systolic !== null && bpValue.diastolic !== null) {
          const marker = await db.healthMarker.create({
            data: {
              sessionId: job.data.sessionId,
              markerType: "bloodPressure",
              data: JSON.stringify({
                systolic: bpValue.systolic,
                diastolic: bpValue.diastolic,
              }),
            },
          });
          results.push(marker);
        }
      } else if (typeof value === "number") {
        const marker = await db.healthMarker.create({
          data: {
            sessionId: job.data.sessionId,
            markerType: type,
            data: JSON.stringify({ value }),
          },
        });
        results.push(marker);
      }
    }

    return {
      processed: true,
      metrics: results,
    };
  } catch (error) {
    console.error("Error in health metrics extraction:", error);
    throw error;
  }
}
