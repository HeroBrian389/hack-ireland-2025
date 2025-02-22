// ./src/app/api/upload/route.ts

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { randomUUID } from "crypto";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { db } from "~/server/db";
import { env } from "~/env";
import { uploadToS3, s3Client } from "~/server/utils/s3";
import { convertPdfToImagesAndUpload } from "~/server/utils/pdfToImages";

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

/**
 * Read the uploaded files from the FormData.
 */
async function readFormDataImages(request: NextRequest) {
  const formData = await request.formData();
  const files = formData.getAll("files") as File[];
  return files;
}

export async function POST(request: NextRequest) {
  try {
    // 1) Parse incoming formData for "files"
    const files = await readFormDataImages(request);

    if (!files.length) {
      return NextResponse.json(
        { success: false, error: "No files included" },
        { status: 400 },
      );
    }

    // Example: get sessionId from URL query
    const url = new URL(request.url);
    const sessionId = url.searchParams.get("sessionId");
    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: "No sessionId provided" },
        { status: 400 },
      );
    }

    // Check if this is a temporary session ID
    const isTemporarySession = sessionId.startsWith('temp_');
    
    if (!isTemporarySession) {
      // Only verify database session for non-temporary sessions
      const session = await db.session.findUnique({
        where: { id: sessionId },
        select: { id: true, state: true }
      });

      if (!session) {
        return NextResponse.json(
          { success: false, error: "Invalid session ID" },
          { status: 404 },
        );
      }

      if (session.state !== "IN_PROGRESS") {
        return NextResponse.json(
          { success: false, error: "Session is not in progress" },
          { status: 400 },
        );
      }
    }

    const results: Array<{
      fileName: string;
      mediaId: string;
      analysis: string;
      url: string;
      presignedUrl: string;
    }> = [];

    // 2) Loop over each uploaded file
    for (const file of files) {
      const fileArrayBuffer = await file.arrayBuffer();
      const fileBuffer = Buffer.from(fileArrayBuffer);
      const fileExt = file.name.split(".").pop()?.toLowerCase() ?? "";
      const fileId = randomUUID();
      const baseKey = `uploads/${fileId}`;

      let finalStoredLocations: string[] = [];

      // 2a) If it's a PDF, convert to images & upload each
      if (fileExt === "pdf") {
        finalStoredLocations = await convertPdfToImagesAndUpload(
          fileBuffer,
          "health-kiosk", // your bucket name
          baseKey,
        );
      } else {
        // Otherwise treat as a single image / doc:
        const s3Key = `${baseKey}-${file.name}`;
        const url = await uploadToS3(
          "health-kiosk",
          s3Key,
          fileBuffer,
          file.type || "application/octet-stream",
        );
        finalStoredLocations.push(url);
      }

      // 2b) Insert rows into Media table for each uploaded item
      //  We'll treat multi-page PDFs as multiple Media records:
      const insertedMedias = await Promise.all(
        finalStoredLocations.map(async (location) => {
          if (isTemporarySession) {
            // For temporary sessions, just return a mock media object
            // This avoids database constraints while still allowing analysis
            return {
              id: randomUUID(),
              sessionId,
              mediaType: fileExt === "pdf" ? "image" : "image",
              storageLocation: location,
              capturedAt: new Date(),
            };
          }
          
          return db.media.create({
            data: {
              sessionId,
              mediaType: fileExt === "pdf" ? "image" : "image", 
              storageLocation: location,
            },
          });
        }),
      );

      // 2c) Summarize or analyze *each* uploaded image with GPT-4 ( Vision-like approach )
      //     We'll combine all pages or images in one prompt for demonstration,
      //     but you can do them individually if you want separate analyses.
      //     Here we call GPT-4o or GPT-4 with image URLs:

      // Generate pre-signed URLs for OpenAI to access
      const getPresignedUrl = async (location: string) => {
        const bucketName = "health-kiosk";
        const key = location.replace(`https://${bucketName}.s3.eu-west-1.amazonaws.com/`, '');
        const command = new GetObjectCommand({
          Bucket: bucketName,
          Key: key,
        });
        return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
      };

      const presignedUrls = await Promise.all(
        finalStoredLocations.map(location => getPresignedUrl(location))
      );

      const messages = [{
        role: "user" as const,
        content: [
          { type: "text" as const, text: "Please summarize what is in these images." },
          ...presignedUrls.map(url => ({
            type: "image_url" as const,
            image_url: { url }
          }))
        ]
      }];

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        store: true,
      });
      const analysis = completion.choices[0]?.message?.content ?? "No analysis available";

      // 2d) Store analysis in VisionAnalysis table
      //     For simplicity, we just store one combined analysis for the entire file's images
      const firstMedia = insertedMedias[0];
      if (!firstMedia) {
        throw new Error("Failed to create media record");
      }

      let visionAnalysis;
      if (isTemporarySession) {
        // For temporary sessions, just create a mock analysis object
        visionAnalysis = {
          id: randomUUID(),
          mediaId: firstMedia.id,
          analysisType: fileExt === "pdf" ? "pdf-analysis" : "image-analysis",
          analysisResults: analysis,
        };
      } else {
        visionAnalysis = await db.visionAnalysis.create({
          data: {
            mediaId: firstMedia.id,
            analysisType: fileExt === "pdf" ? "pdf-analysis" : "image-analysis",
            analysisResults: analysis,
          },
        });
      }

      // 2e) For returning in the response, just attach the first Media's ID
      results.push({
        fileName: file.name,
        mediaId: firstMedia.id,
        url: finalStoredLocations[0]!,
        presignedUrl: presignedUrls[0]!,
        analysis: visionAnalysis.analysisResults ?? "No analysis available",
      });
    }

    return NextResponse.json({ success: true, results });
  } catch (err: any) {
    console.error("File upload error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Unknown error" },
      { status: 500 },
    );
  }
}
