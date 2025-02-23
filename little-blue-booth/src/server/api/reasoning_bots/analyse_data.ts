import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const ANALYSIS_PROMPT = `You are an expert clinican.

You excel at generating hypotheses for a given medical consult.

Refuse to answer if you cannot add any new analysis to the existing hypotheses.
`;

export async function query_chat_bot(prompt: string) {
  const completion = await openai.chat.completions.create({
    model: "o1-mini",
    messages: [
      {
        role: "user",
        content: ANALYSIS_PROMPT,
      },
      {
        role: "user",
        content: `<context>
Read over the attached medical consult, and generate the 3 most likely hypotheses.

Based on the 3 most likely hypotheses, generate 3 questions or actions that could be asked/taken to confirm or deny these hypotheses.

Note that the conversation may just be starting, so don't be too quick to generate hypotheses. If that is the case, just say "No new hypotheses can be generated from the conversation so far."
</context>

<transcript>\n${prompt}\n</transcript>`,
      },
    ],
    store: true,
  });

  const analysis = completion.choices[0]?.message?.content;

  return analysis;
}
