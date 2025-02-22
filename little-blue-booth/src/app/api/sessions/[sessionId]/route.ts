import { NextResponse } from "next/server";
import { createTRPCContext } from "~/server/api/trpc";
import { appRouter } from "~/server/api/root";

interface EndSessionBody {
  email?: string;
}

export async function POST(
  request: Request,
  { params }: { params: { sessionId: string } }
) {
  try {
    const body = (await request.json()) as EndSessionBody;
    const sessionId = params.sessionId;

    // tRPC context + caller
    const ctx = await createTRPCContext({ headers: request.headers });
    const caller = appRouter.createCaller(ctx);

    const summary = await caller.session.endSession({
      sessionId,
      email: body.email,
    });

    return NextResponse.json({ success: true, summary });
  } catch (error) {
    console.error("Error ending session:", error);
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}
