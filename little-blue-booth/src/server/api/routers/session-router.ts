import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { parseHealthMarkersForTrends } from "./session-utils";

/**
 * Example new session router for ending a session and returning a final summary
 */
export const sessionRouter = createTRPCRouter({
  /**
   * Ends a session by marking `endTime` and `state = COMPLETED`,
   * then gathers disclaimers, health marker trends, and recommended steps
   */
  endSession: publicProcedure
    .input(
      z.object({
        sessionId: z.string().uuid(),
        email: z.string().email().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { sessionId, email } = input;

      // 1) Find the Session along with relevant data
      const session = await ctx.db.session.findUnique({
        where: { id: sessionId },
        include: {
          // healthMarkers so we can build marker trends
          healthMarkers: true,
          // recommendations to show recommended steps
          recommendations: true,
        },
      });

      if (!session) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Session not found",
        });
      }

      if (session.endTime) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Session is already ended",
        });
      }

      // 2) Mark session as ended in DB
      const endedSession = await ctx.db.session.update({
        where: { id: sessionId },
        data: {
          endTime: new Date(),
          state: "COMPLETED",
        },
      });

      // 3) Example disclaimers
      const disclaimers = [
        "This summary is for informational purposes only and not a medical diagnosis.",
        "Always consult a qualified healthcare professional for specific guidance.",
      ];

      // 4) Basic health marker trend analysis
      const markerTrends = parseHealthMarkersForTrends(session.healthMarkers);

      // 5) Pull out stored recommendations
      const recommendedSteps = session.recommendations.map((rec) => ({
        title: rec.title,
        description: rec.description,
        externalLinks: rec.externalLinks ? JSON.parse(rec.externalLinks) : [],
      }));

      // 6) Construct final summary payload
      const summary = {
        sessionId: endedSession.id,
        endedAt: endedSession.endTime,
        disclaimers,
        markerTrends,
        recommendedSteps,
      };

      // 7) Optionally email the summary
      if (email) {
        // TODO: Integrate an email-sending function of your choice here
      }

      return summary;
    }),
});
