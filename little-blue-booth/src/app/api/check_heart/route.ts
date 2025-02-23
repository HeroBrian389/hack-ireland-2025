import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { text } = body;

    if (!text) {
      return NextResponse.json(
        { error: 'No text provided' },
        { status: 400 }
      );
    }

    const prompt = `
      Analyze the following text and determine if the symptoms suggest a heart attack. 
      Common heart attack symptoms include:
      - Chest pain or pressure
      - Pain radiating to arm, neck, or jaw
      - Shortness of breath
      - Cold sweats
      - Nausea
      - Lightheadedness
      
      Text to analyze: "${text}"
      
      Respond in JSON format with:
      {
        "isHeartAttack": boolean (true if symptoms suggest heart attack),
        "confidence": string (explanation of your assessment),
        "emergencyLevel": "high"|"medium"|"low"
      }
    `;

    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-4o",
      response_format: { type: "json_object" },
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    const parsedResponse = JSON.parse(response);
    console.log(parsedResponse);
    return NextResponse.json(parsedResponse);

  } catch (error) {
    console.error('Error in check_heart API:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}