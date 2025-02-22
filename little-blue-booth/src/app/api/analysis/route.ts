import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { db } from '~/server/db';

interface Message {
  role: string;
  content: string;
  timestamp?: string;
}

if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing OPENAI_API_KEY environment variable');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const ANALYSIS_PROMPT = `You are an expert clinician.

You excel at generating hypotheses for a given medical consult.

Refuse to answer if you cannot add any new analysis to the existing hypotheses.
`;

export async function POST(request: Request) {
  try {
    const { conversation } = await request.json();

    if (!conversation || conversation.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No conversation provided' },
        { status: 400 }
      );
    }

    // Format the conversation transcript
    const transcript = conversation
      .map((msg: Message) => `${msg.role.toUpperCase()}: ${msg.content}`)
      .join('\n');

    // Call the OpenAI chat completions endpoint
    const completion = await openai.chat.completions.create({
      model: 'o3-mini',
      reasoning_effort: 'low',
      messages: [
        {
          role: 'system',
          content: ANALYSIS_PROMPT,
        },
        {
          role: 'user',
          content: `<context>
Read over the attached medical consult, and generate a list of hypotheses as well as possible questions, clinical examinations, or other tests that could be performed.

Base your analysis exclusively on the patient responses to the questions - don't let the doctor questions bias you towards a particular diagnosis.

Note that the conversation may just be starting, so don't be too quick to generate hypotheses. If that is the case, just say "No new hypotheses can be generated from the conversation so far."
</context>

<transcript>
${transcript}
</transcript>`,
        },
      ],
      store: true,
    });

    const analysis = completion.choices[0].message.content;

    if (!analysis) {
      return NextResponse.json(
        { success: false, error: 'No analysis generated' },
        { status: 500 }
      );
    }

    // Store the conversation and analysis in the database
    const savedAnalysis = await db.continuousAnalysis.create({
      data: {
        messages: JSON.stringify(conversation),
        content: analysis,
        timestamp: new Date(),
      },
    });

    console.log('Analysis:', analysis);

    return NextResponse.json({
      success: true,
      analysis,
      savedData: savedAnalysis,
    });
  } catch (error) {
    console.error('Error analyzing conversation:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to analyze conversation',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  } finally {
    await db.$disconnect();
  }
}
