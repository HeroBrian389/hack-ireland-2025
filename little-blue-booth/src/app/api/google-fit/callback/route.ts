import { google } from "googleapis";
import { NextResponse } from "next/server";
import { db } from "~/server/db";
import type { Credentials } from "google-auth-library";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !APP_URL) {
  throw new Error("Missing required environment variables for Google OAuth");
}

const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  `${APP_URL}/api/google-fit/callback`,
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state"); // This contains the userId we passed

    console.log("Received callback with:", {
      hasCode: !!code,
      hasState: !!state,
    });

    if (!code || !state) {
      console.error("Missing code or state in callback");
      return NextResponse.redirect(`${APP_URL}?error=missing_params`);
    }

    try {
      const { tokens } = await oauth2Client.getToken(code);
      console.log("Received tokens:", {
        hasAccessToken: !!tokens.access_token,
        hasRefreshToken: !!tokens.refresh_token,
        hasExpiryDate: !!tokens.expiry_date,
      });

      if (
        !tokens.access_token ||
        !tokens.refresh_token ||
        !tokens.expiry_date
      ) {
        console.error("Missing required token fields:", {
          hasAccessToken: !!tokens.access_token,
          hasRefreshToken: !!tokens.refresh_token,
          hasExpiryDate: !!tokens.expiry_date,
        });
        throw new Error("Missing required token fields");
      }

      // Store the tokens in the database
      await db.googleFitTokens.upsert({
        where: { userId: state },
        create: {
          userId: state,
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

      console.log("Successfully stored tokens in database");

      // Redirect back to the frontend with success
      return NextResponse.redirect(`${APP_URL}?success=true`);
    } catch (error) {
      console.error("Error exchanging code for tokens:", error);
      return NextResponse.redirect(`${APP_URL}?error=token_exchange_failed`);
    }
  } catch (error) {
    console.error("Error in Google Fit callback:", error);
    return NextResponse.redirect(`${APP_URL}?error=callback_failed`);
  }
}
