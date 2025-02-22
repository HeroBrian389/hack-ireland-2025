import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";
import { getAuthUrl, getFitData } from "~/services/googleFitService";

/** GET: generates the Google Fit auth URL */
export async function GET(req: NextRequest) {
  const { userId } = getAuth(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const authUrl = await getAuthUrl(userId);
    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error("Failed to generate auth URL:", error);
    return NextResponse.json(
      { error: "Failed to generate auth URL" },
      { status: 500 },
    );
  }
}

// 3) POST: retrieve Google Fit data for the requested metrics
export async function POST(req: NextRequest) {
  const { userId } = getAuth(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await getFitData(userId);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to fetch Google Fit data:", error);
    if (
      error instanceof Error &&
      error.message === "Not connected to Google Fit"
    ) {
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
