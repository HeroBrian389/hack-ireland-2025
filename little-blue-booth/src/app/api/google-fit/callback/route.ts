import { NextResponse } from "next/server";
import { handleCallback } from "~/services/googleFitService";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state"); // This contains the userId we passed

    if (!code || !state) {
      console.error("Missing code or state in callback");
      return NextResponse.redirect(`${APP_URL}?error=missing_params`);
    }

    try {
      await handleCallback(code, state);
      return NextResponse.redirect(`${APP_URL}?success=true`);
    } catch (error) {
      console.error("Error handling callback:", error);
      return NextResponse.redirect(`${APP_URL}?error=token_exchange_failed`);
    }
  } catch (error) {
    console.error("Error in Google Fit callback:", error);
    return NextResponse.redirect(`${APP_URL}?error=callback_failed`);
  }
}
