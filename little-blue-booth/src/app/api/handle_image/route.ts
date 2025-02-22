import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
const OPENAI_API_KEY = 
export async function POST(req: NextRequest) {
  console.log("📥 Received a POST request at /api/handle_image");

  try {
    // ✅ Await formData extraction
    const formData = await req.formData();
    // ✅ Log the entire formData as an object
    console.log("🔍 Full FormData Entries:");
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        console.log(
          `📂 File - Key: ${key}, Name: ${value.name}, Type: ${value.type}, Size: ${value.size} bytes`,
        );
      } else {
        console.log(`🔤 Field - Key: ${key}, Value: ${value}`);
      }
    }

    return NextResponse.json({ message: "Form data logged successfully" });
  } catch (error) {
    console.error("❌ Error processing form data:", error);
    return NextResponse.json(
      { error: "Failed to process form data" },
      { status: 500 },
    );
  }
}
