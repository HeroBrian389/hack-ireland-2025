import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI();

export async function POST(req: Request) {
  try {
    const { conversation } = await req.json();

    if (!Array.isArray(conversation)) {
      return NextResponse.json(
        { error: "Invalid conversation format" },
        { status: 400 }
      );
    }

    // Create a system message to guide the summary generation
    const systemMessage = {
      role: "system",
      content: `Please provide a comprehensive summary of this medical consultation. The summary should:
1. Start with a brief overview of the consultation
2. List the main topics discussed
3. Highlight any key medical findings or concerns
4. Include any recommendations or next steps
5. Mention any analyzed files or documents
6. Include any important insights generated during the consultation

Format the summary with clear sections and bullet points where appropriate.`,
    };

    // Add the system message at the start of the conversation
    const messages = [systemMessage, ...conversation];

    // Generate the summary using OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: messages.map(msg => ({
        role: msg.role as "system" | "user" | "assistant",
        content: msg.content,
      })),
      temperature: 0.7,
      max_tokens: 2000,
    });

    const summary = response.choices[0]?.message?.content;

    if (!summary) {
      throw new Error("Failed to generate summary");
    }

    return NextResponse.json({ summary });
  } catch (error) {
    console.error("Error generating summary:", error);
    return NextResponse.json(
      { error: "Failed to generate summary" },
      { status: 500 }
    );
  }
} 