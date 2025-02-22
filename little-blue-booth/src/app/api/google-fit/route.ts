import { google } from "googleapis";
import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import type { fitness_v1 } from "googleapis";
import type { NextRequest } from "next/server";
import { db } from "~/server/db";

// Ensure we have the required environment variables
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !APP_URL) {
  throw new Error("Missing required environment variables for Google OAuth");
}

async function getAuthenticatedClient(userId: string) {
  try {
    // Get tokens from database
    const tokens = await db.googleFitTokens.findUnique({
      where: { userId },
    });

    console.log("Retrieved tokens from DB:", {
      hasAccessToken: !!tokens?.accessToken,
      hasRefreshToken: !!tokens?.refreshToken,
      hasExpiryDate: !!tokens?.expiryDate,
    });

    if (!tokens) {
      throw new Error("Not connected to Google Fit");
    }

    // Create new OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      `${APP_URL}/api/google-fit/callback`,
    );

    // Set credentials
    oauth2Client.setCredentials({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expiry_date: Number(tokens.expiryDate),
    });

    // Handle token refresh
    oauth2Client.on("tokens", (newTokens) => {
      console.log("Received new tokens:", {
        hasAccessToken: !!newTokens.access_token,
        hasRefreshToken: !!newTokens.refresh_token,
        hasExpiryDate: !!newTokens.expiry_date,
      });

      if (newTokens.access_token) {
        void db.googleFitTokens.update({
          where: { userId },
          data: {
            accessToken: newTokens.access_token,
            ...(newTokens.refresh_token && {
              refreshToken: newTokens.refresh_token,
            }),
            ...(newTokens.expiry_date && {
              expiryDate: BigInt(newTokens.expiry_date),
            }),
          },
        });
      }
    });

    return oauth2Client;
  } catch (error) {
    console.error("Error in getAuthenticatedClient:", error);
    throw error;
  }
}

// Create OAuth2 client for initial auth flow
const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  `${APP_URL}/api/google-fit/callback`,
);

export async function GET(req: NextRequest) {
  const { userId } = getAuth(req);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Generate authentication URL
  const scopes = [
    "https://www.googleapis.com/auth/fitness.activity.read",
    "https://www.googleapis.com/auth/fitness.heart_rate.read",
    "https://www.googleapis.com/auth/fitness.sleep.read",
    "https://www.googleapis.com/auth/fitness.body.read",
    "https://www.googleapis.com/auth/fitness.nutrition.read",
    "https://www.googleapis.com/auth/fitness.blood_glucose.read",
    "https://www.googleapis.com/auth/fitness.blood_pressure.read",
    "https://www.googleapis.com/auth/fitness.oxygen_saturation.read",
    "https://www.googleapis.com/auth/fitness.body_temperature.read",
  ];

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    state: userId, // Pass userId as state to retrieve it in callback
    prompt: "consent", // Force consent screen to ensure we get refresh token
  });

  return NextResponse.json({ authUrl });
}

interface TimeRange {
  startTime: number;
  endTime: number;
}

interface RequestBody {
  timeRange: TimeRange;
  dataTypes: string[];
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Processing request for userId:", userId);

    // Get authenticated client
    const authClient = await getAuthenticatedClient(userId);
    const fitness = google.fitness({ version: "v1", auth: authClient });

    const body = (await req.json()) as RequestBody;
    const { timeRange, dataTypes } = body;
    const { startTime, endTime } = timeRange;

    console.log("Fetching data for time range:", {
      startTime,
      endTime,
      dataTypes,
    });

    const aggregateBy: Array<{ dataTypeName: string }> = [];

    // Map requested data types to Google Fit data type names
    if (dataTypes.includes("steps")) {
      aggregateBy.push({ dataTypeName: "com.google.step_count.delta" });
    }
    if (dataTypes.includes("heartRate")) {
      aggregateBy.push({ dataTypeName: "com.google.heart_rate.bpm" });
    }
    if (dataTypes.includes("calories")) {
      aggregateBy.push({ dataTypeName: "com.google.calories.expended" });
    }
    if (dataTypes.includes("activity")) {
      aggregateBy.push({ dataTypeName: "com.google.activity.segment" });
    }

    let request: fitness_v1.Params$Resource$Users$Dataset$Aggregate = {
      userId: "me",
      requestBody: {
        aggregateBy,
        bucketByTime: { durationMillis: "86400000" }, // 1 day
        startTimeMillis: startTime.toString(),
        endTimeMillis: endTime.toString(),
      },
    };

    // Special handling for sleep data
    if (dataTypes.includes("sleep")) {
      request = {
        userId: "me",
        requestBody: {
          aggregateBy: [
            {
              dataTypeName: "com.google.sleep.segment",
            },
          ],
          bucketByTime: { durationMillis: "86400000" }, // 1 day
          startTimeMillis: startTime.toString(),
          endTimeMillis: endTime.toString(),
        },
      };
    }

    const response = await fitness.users.dataset.aggregate(request);
    console.log("Received response:", response.data);

    return NextResponse.json(response.data);
  } catch (err) {
    // Type guard for Error objects
    const error = err instanceof Error ? err : new Error(String(err));

    console.error("Detailed error in POST endpoint:", {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });

    if (error.message === "Not connected to Google Fit") {
      return NextResponse.json(
        { error: "Not connected to Google Fit" },
        { status: 401 },
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch Google Fit data" },
      { status: 500 },
    );
  }
}
