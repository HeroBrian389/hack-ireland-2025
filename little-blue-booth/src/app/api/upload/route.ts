// ./src/app/api/upload/route.ts

import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import OpenAI from "openai";

import { db } from "~/server/db";

// Example environment variables. Adjust as needed.
const S3_REGION = process.env.S3_REGION ?? "us-east-1";
const S3_BUCKET = process.env.S3_BUCKET ?? "";
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY ?? "";
const S3_SECRET_KEY = process.env.S3_SECRET_KEY ?? "";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  throw new Error("Missing OPENAI_API_KEY in your environment.");
}
if (!S3_BUCKET || !S3_ACCESS_KEY || !S3_SECRET_KEY) {
  throw new Error("Missing S3 config environment variables.");
}

// Minimal S3 client config for demonstration.
const s3 = new S3Client({
  region: S3_REGION,
  credentials: {
    accessKeyId: S3_ACCESS_KEY,
    secretAccessKey: S3_SECRET_KEY,
  },
});

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

// Utility to read the file from the form data (Next.js supports `Request.formData()`)
async function readFormDataImages(request: NextRequest) {
  // Using NextRequest's built-in formData capabilities
  const formData = await request.formData();

  // We'll assume multiple files can be uploaded under "files"
  const files = formData.getAll("files") as File[];

  return files;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Parse incoming FormData, which contains "files"
    const files = await readFormDataImages(request);

    if (!files.length) {
      return NextResponse.json(
        { success: false, error: "No files included" },
        { status: 400 }
      );
    }

    // Optionally, you might want the client to include a "sessionId" or "userId"
    // For demonstration, we'll pretend "sessionId" was in the querystring or something
    const url = new URL(request.url);
    const sessionId = url.searchParams.get("sessionId");
    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: "No sessionId provided" },
        { status: 400 }
      );
    }

    const results = [];

    // 2. Loop over each uploaded File
    for (const file of files) {
      // 2a. Generate unique storage key and upload to S3
      const fileId = randomUUID();
      const s3Key = `scans/${fileId}-${file.name}`;

      const arrayBuffer = await file.arrayBuffer();
      const fileBuffer = Buffer.from(arrayBuffer);

      // Upload to S3
      await s3.send(
        new PutObjectCommand({
          Bucket: S3_BUCKET,
          Key: s3Key,
          Body: fileBuffer,
          ContentType: file.type,
        })
      );

      // 2b. Insert row in Media table
      //     (We’re storing the S3 path in "storageLocation".)
      const newMedia = await db.media.create({
        data: {
          sessionId,
          mediaType: "image",
          storageLocation: `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${s3Key}`,
        },
      });

      // 2c. For analysis with GPT-4: 
      //     Here we just do a sample call. Adjust to real GPT-4 vision logic or other approach.
      //     This is a simplified text-based scenario—your actual image analysis might differ.
      //     Example approach: Provide a URL & text instructions to GPT, or use a Vision API, etc.
      const artificialPrompt = `Please analyze this image (S3 path: ${newMedia.storageLocation}) for any notable medical findings. Summarize any potential issues. If no obvious issue, say so.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: "You are a medical imaging analysis assistant." },
          { role: "user", content: artificialPrompt },
        ],
      });
      const analysis = completion.choices[0]?.message?.content ?? "";

      // 2d. Store that analysis in VisionAnalysis referencing the new media
      const visionAnalysis = await db.visionAnalysis.create({
        data: {
          mediaId: newMedia.id,
          analysisType: "scan-analysis",
          analysisResults: analysis,
        },
      });

      // Keep track of results to return
      results.push({
        fileName: file.name,
        mediaId: newMedia.id,
        analysis: visionAnalysis.analysisResults,
      });
    }

    return NextResponse.json({ success: true, results });
  } catch (err: any) {
    console.error("File upload error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
