import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";


const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
});

export const config = {
    api: { bodyParser: false }, // Required for handling formData manually
};

export async function POST(request: NextRequest) {
    try {
        // 1️⃣ Read multipart/form-data from the request
        const formData = await request.formData();

        // 2️⃣ Get the uploaded file (expects "file" field in FormData)
        const file = formData.get("file");

        // 3️⃣ Validate if we got a valid file
        if (!file || !(file instanceof Blob)) {
            return NextResponse.json({ success: false, error: "No file uploaded" }, { status: 400 });
        }

        // 4️⃣ Convert file to Buffer (for use in processing, uploads, etc.)
        const arrayBuffer = await file.arrayBuffer();
        const data = Buffer.from(arrayBuffer).toString("base64");


        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: "Describe in general terms what is happening in this image. What is the main subject? What is the main action? What is the main setting? We want to help in a medical context - describe anything that might be medically relevant. Make this exceptionally detailed." },
                        {
                            type: "image_url",
                            image_url: {
                                "url": `data:image/png;base64,${data}`,
                            },
                        },
                    ],
                },
            ],
            store: true,
        });

        // 5️⃣ Return the response (for debugging)
        return NextResponse.json({
            success: true,
            message: "File received successfully",
            filename: (file as File).name,
            fileType: (file as File).type,
            fileSize: (file as File).size,
            description: response.choices[0].message
        });


    } catch (error) {
        console.error("Error processing image upload:", error);

    }
}