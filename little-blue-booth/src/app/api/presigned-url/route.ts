import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client } from "~/server/utils/s3";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const location = url.searchParams.get("location");

    if (!location) {
      return NextResponse.json(
        { success: false, error: "No location provided" },
        { status: 400 }
      );
    }

    const bucketName = "health-kiosk";
    const key = location.replace(
      `https://${bucketName}.s3.eu-west-1.amazonaws.com/`,
      ""
    );

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    return NextResponse.json({ success: true, url: presignedUrl });
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate presigned URL" },
      { status: 500 }
    );
  }
} 