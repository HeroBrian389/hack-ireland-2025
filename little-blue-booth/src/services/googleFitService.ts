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
    "https://www.googleapis.com/auth/fitness.blood_pressure.read",
    "https://www.googleapis.com/auth/fitness.blood_glucose.read",
    "https://www.googleapis.com/auth/fitness.oxygen_saturation.read",
    "https://www.googleapis.com/auth/fitness.body.read",
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

interface GoogleFitDataPoint {
  startTimeNanos: string;
  endTimeNanos: string;
  value: Array<{
    fpVal?: number;
    intVal?: number;
  }>;
}

interface GoogleFitDataset {
  dataSourceId?: string | null;
  point?: GoogleFitDataPoint[];
}

interface GoogleFitBucket {
  startTimeMillis?: string | null;
  endTimeMillis?: string | null;
  dataset?: GoogleFitDataset[] | null;
}

interface GoogleFitResponse {
  bucket: GoogleFitBucket[];
}

// Updated DATA_SOURCES to match aggregated format
const DATA_SOURCES = {
  HEART_RATE:
    "derived:com.google.heart_rate.summary:com.google.android.gms:aggregated",
  BLOOD_PRESSURE:
    "derived:com.google.blood_pressure.summary:com.google.android.gms:aggregated",
  OXYGEN_SATURATION:
    "derived:com.google.oxygen_saturation.summary:com.google.android.gms:aggregated",
  WEIGHT: "derived:com.google.weight.summary:com.google.android.gms:aggregated",
  HEIGHT: "derived:com.google.height.summary:com.google.android.gms:aggregated",
} as const;

export async function getFitData(userId: string): Promise<{
  bmi: number | null;
  height: number | null;
  weight: number | null;
  heartRate: number | null;
  bloodPressure: { systolic: number | null; diastolic: number | null } | null;
  bloodOxygen: number | null;
}> {
  const tokens = await db.googleFitTokens.findUnique({ where: { userId } });
  if (!tokens) {
    throw new Error("Not connected to Google Fit");
  }

  oauth2Client.setCredentials({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    expiry_date: Number(tokens.expiryDate),
  });

  // Refresh token if less than 5 minutes remain
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
  const oneDayAgo = now - 24 * 60 * 60 * 1000;

  const response = await fitness.users.dataset.aggregate({
    userId: "me",
    requestBody: {
      aggregateBy: [
        { dataTypeName: "com.google.heart_rate.bpm" },
        { dataTypeName: "com.google.blood_pressure" },
        { dataTypeName: "com.google.oxygen_saturation" },
        { dataTypeName: "com.google.weight" },
        { dataTypeName: "com.google.height" },
      ],
      bucketByTime: { durationMillis: "86400000" }, // 24 hours
      startTimeMillis: oneDayAgo.toString(),
      endTimeMillis: now.toString(),
    },
  });

  if (
    !response.data ||
    !response.data.bucket ||
    response.data.bucket.length === 0
  ) {
    return {
      bmi: null,
      height: null,
      weight: null,
      heartRate: null,
      bloodPressure: null,
      bloodOxygen: null,
    };
  }

  // Cast the response buckets to your type.
  const buckets = response.data.bucket as unknown as GoogleFitBucket[];

  const result = {
    bmi: null as number | null,
    height: null as number | null,
    weight: null as number | null,
    heartRate: null as number | null,
    bloodPressure: null as {
      systolic: number | null;
      diastolic: number | null;
    } | null,
    bloodOxygen: null as number | null,
  };

  const getLatestValue = (dataset: GoogleFitDataset): number | null => {
    const valueObj = dataset?.point?.[0]?.value?.[0];
    if (valueObj?.fpVal !== undefined) return valueObj.fpVal;
    if (valueObj?.intVal !== undefined) return valueObj.intVal;
    return null;
  };

  const processDataset = (bucket: GoogleFitBucket): typeof result => {
    const processedResult = { ...result };

    bucket.dataset?.forEach((dataset) => {
      const dsId = dataset.dataSourceId ?? "";

      if (!dataset?.point?.[0]?.value) return;

      if (dsId.includes("heart_rate")) {
        processedResult.heartRate = getLatestValue(dataset);
      } else if (dsId.includes("blood_pressure")) {
        const systolic = dataset?.point?.[0]?.value?.[0]?.fpVal ?? null;
        const diastolic = dataset?.point?.[0]?.value?.[1]?.fpVal ?? null;
        if (systolic !== null && diastolic !== null) {
          processedResult.bloodPressure = { systolic, diastolic };
        }
      } else if (dsId.includes("oxygen_saturation")) {
        processedResult.bloodOxygen = getLatestValue(dataset);
      } else if (dsId.includes("weight")) {
        processedResult.weight = getLatestValue(dataset);
      } else if (dsId.includes("height")) {
        processedResult.height = getLatestValue(dataset);
      }
    });

    return processedResult;
  };

  const processedResults = buckets.map(processDataset);
  const finalResult = processedResults.reduce(
    (acc, curr) => ({
      bmi: curr.bmi ?? acc.bmi,
      height: curr.height ?? acc.height,
      weight: curr.weight ?? acc.weight,
      heartRate: curr.heartRate ?? acc.heartRate,
      bloodPressure: curr.bloodPressure ?? acc.bloodPressure,
      bloodOxygen: curr.bloodOxygen ?? acc.bloodOxygen,
    }),
    result,
  );

  if (finalResult.height && finalResult.weight) {
    const heightInMeters = finalResult.height / 100;
    finalResult.bmi = finalResult.weight / (heightInMeters * heightInMeters);
  }

  console.log("[Google Fit] Final result:", finalResult);
  return finalResult;
}
