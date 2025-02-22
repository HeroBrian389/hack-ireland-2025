// ./src/app/api/upload/route.ts

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { randomUUID } from "crypto";

import { db } from "~/server/db";
import { env } from "~/env";
import { uploadToS3 } from "~/server/utils/s3";
import { convertPdfToImagesAndUpload } from "~/server/utils/pdfToImages";

const openai = new OpenAI({
  apiKey: env.server.OPENAI_API_KEY,
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

    const results: Array<{
      fileName: string;
      mediaId: string;
      analysis: string;
    }> = [];

    // 2) Loop over each uploaded file
    for (const file of files) {
      const fileArrayBuffer = await file.arrayBuffer();
      const fileBuffer = Buffer.from(fileArrayBuffer);
      const fileExt = file.name.split(".").pop()?.toLowerCase();
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
      const messages: any = [
        {
          role: "user",
          content: [
            { type: "text", text: "Please summarize what is in these images." },
          ],
        },
      ];

      for (const location of finalStoredLocations) {
        messages[0].content.push({
          type: "image_url",
          image_url: { url: location },
        });
      }

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        store: true,
      });
      const analysis = completion.choices[0]?.message?.content ?? "";

      // 2d) Store analysis in VisionAnalysis table
      //     For simplicity, we just store one combined analysis for the entire file’s images
      const firstMedia = insertedMedias[0];
      const visionAnalysis = await db.visionAnalysis.create({
        data: {
          mediaId: firstMedia.id,
          analysisType: fileExt === "pdf" ? "pdf-analysis" : "image-analysis",
          analysisResults: analysis,
        },
      });

      // 2e) For returning in the response, just attach the first Media's ID
      results.push({
        fileName: file.name,
        mediaId: firstMedia.id,
        analysis: visionAnalysis.analysisResults,
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
