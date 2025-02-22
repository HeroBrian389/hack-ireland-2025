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
  // Get last 24 hours of data
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
        { dataTypeName: "com.google.body.fat.percentage" }, // For BMI calculation
      ],
      bucketByTime: { durationMillis: "86400000" }, // 24 hours in milliseconds
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

  // Process the response data
  const latestBucket = response.data.bucket[response.data.bucket.length - 1];
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

  // Helper function to get the latest value from a dataset
  const getLatestValue = (dataset: any) => {
    if (!dataset?.point?.[0]?.value?.[0]?.fpVal) return null;
    return dataset.point[0].value[0].fpVal;
  };

  latestBucket.dataset?.forEach((dataset: any) => {
    switch (dataset.dataSourceId) {
      case "derived:com.google.heart_rate.bpm:com.google.android.gms:merge_heart_rate_bpm":
        result.heartRate = getLatestValue(dataset);
        break;
      case "derived:com.google.blood_pressure:com.google.android.gms:merged":
        const systolic = dataset?.point?.[0]?.value?.[0]?.fpVal;
        const diastolic = dataset?.point?.[0]?.value?.[1]?.fpVal;
        if (systolic && diastolic) {
          result.bloodPressure = { systolic, diastolic };
        }
        break;
      case "derived:com.google.oxygen_saturation:com.google.android.gms:merged":
        result.bloodOxygen = getLatestValue(dataset);
        break;
      case "derived:com.google.weight:com.google.android.gms:merged":
        result.weight = getLatestValue(dataset);
        break;
      case "derived:com.google.height:com.google.android.gms:merged":
        result.height = getLatestValue(dataset);
        break;
    }
  });

  // Calculate BMI if we have both height and weight
  if (result.height && result.weight) {
    const heightInMeters = result.height / 100; // Convert cm to meters
    result.bmi = result.weight / (heightInMeters * heightInMeters);
  }

  return result;
}
