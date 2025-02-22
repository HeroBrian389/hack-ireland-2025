import { fitness_v1, google } from "googleapis";
import { db } from "~/server/db";
import { env } from "~/env";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const oauth2Client = new google.auth.OAuth2(
  env.GOOGLE_CLIENT_ID,
  env.GOOGLE_CLIENT_SECRET,
  `${APP_URL}/api/google-fit/callback`,
);

export async function getAuthUrl(userId: string) {
  const scopes = [
    "https://www.googleapis.com/auth/fitness.activity.read",
    "https://www.googleapis.com/auth/fitness.heart_rate.read",
  ];

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    state: userId,
    prompt: "consent",
  });
}

export async function handleCallback(code: string, userId: string) {
  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.access_token || !tokens.refresh_token || !tokens.expiry_date) {
    throw new Error("Invalid tokens received from Google");
  }

  await db.googleFitTokens.upsert({
    where: { userId },
    create: {
      userId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiryDate: BigInt(tokens.expiry_date),
    },
    update: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiryDate: BigInt(tokens.expiry_date),
    },
  });
}

export async function getFitData(
  userId: string,
): Promise<fitness_v1.Schema$AggregateResponse> {
  const tokens = await db.googleFitTokens.findUnique({ where: { userId } });
  if (!tokens) {
    throw new Error("Not connected to Google Fit");
  }

  oauth2Client.setCredentials({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    expiry_date: Number(tokens.expiryDate),
  });

  // Check if token needs refresh (if less than 5 minutes remaining)
  if (
    tokens.expiryDate &&
    Number(tokens.expiryDate) - Date.now() < 5 * 60 * 1000
  ) {
    const { credentials } = await oauth2Client.refreshAccessToken();
    await db.googleFitTokens.update({
      where: { userId },
      data: {
        accessToken: credentials.access_token!,
        refreshToken: credentials.refresh_token ?? tokens.refreshToken,
        expiryDate: BigInt(credentials.expiry_date!),
      },
    });
  }

  const fitness = google.fitness({ version: "v1", auth: oauth2Client });
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

  const response = await fitness.users.dataset.aggregate({
    userId: "me",
    requestBody: {
      aggregateBy: [
        { dataTypeName: "com.google.step_count.delta" },
        { dataTypeName: "com.google.calories.expended" },
        { dataTypeName: "com.google.heart_rate.bpm" },
        { dataTypeName: "com.google.activity.segment" },
        { dataTypeName: "com.google.sleep.segment" },
      ],
      bucketByTime: { durationMillis: "86400000" },
      startTimeMillis: thirtyDaysAgo.toString(),
      endTimeMillis: now.toString(),
    },
  });

  if (!response.data) {
    throw new Error("No data returned from Google Fit");
  }

  return response.data;
}

// Helper function to build the aggregate request
export function buildAggregateRequest(
  dataTypes: string[],
  timeRange: { startTime: number; endTime: number },
) {
  const GOOGLE_FIT_METRICS_CONFIG: Record<
    string,
    { dataTypeName: string; isSleep?: boolean }
  > = {
    steps: { dataTypeName: "com.google.step_count.delta" },
    heartRate: { dataTypeName: "com.google.heart_rate.bpm" },
    calories: { dataTypeName: "com.google.calories.expended" },
    activity: { dataTypeName: "com.google.activity.segment" },
    sleep: { dataTypeName: "com.google.sleep.segment", isSleep: true },
    height: { dataTypeName: "com.google.height" },
    weight: { dataTypeName: "com.google.weight" },
    bloodPressure: { dataTypeName: "com.google.blood_pressure" },
    bloodOxygen: { dataTypeName: "com.google.oxygen_saturation" },
    bloodGlucose: { dataTypeName: "com.google.blood_glucose" },
  };

  const aggregateBy: Array<{ dataTypeName: string }> = [];
  let needsSleep = false;

  for (const dt of dataTypes) {
    const config = GOOGLE_FIT_METRICS_CONFIG[dt];
    if (!config) continue;
    if (config.isSleep) {
      needsSleep = true;
    } else {
      aggregateBy.push({ dataTypeName: config.dataTypeName });
    }
  }

  const request = {
    userId: "me",
    requestBody: {
      aggregateBy,
      bucketByTime: { durationMillis: "86400000" },
      startTimeMillis: timeRange.startTime.toString(),
      endTimeMillis: timeRange.endTime.toString(),
    },
  };

  return { request, needsSleep };
}
