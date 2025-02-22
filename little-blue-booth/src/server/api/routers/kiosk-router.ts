import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";

const createSessionSchema = z.object({
  kioskId: z.string().uuid(),
  userId: z.string(),
});

export const kioskRouter = createTRPCRouter({
  createSession: publicProcedure
    .input(createSessionSchema)
    .mutation(async ({ ctx, input }) => {
      const { kioskId, userId } = input;

      // First, try to find the kiosk or create it if it doesn't exist
      const kiosk = await ctx.db.kiosk.upsert({
        where: { id: kioskId },
        create: {
          id: kioskId,
          status: "ACTIVE",
        },
        update: {}, // Don't update anything if it exists
        select: { status: true },
      });

      if (kiosk.status !== "ACTIVE") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Kiosk is not active",
        });
      }

      // Check for an existing active session
      const activeSession = await ctx.db.session.findFirst({
        where: {
          kioskId,
          state: "IN_PROGRESS",
          endTime: null,
        },
        select: { id: true },
      });

      if (activeSession) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "An active session already exists for this kiosk",
        });
      }

      try {
        // Create a new session
        const session = await ctx.db.session.create({
          data: {
            kioskId,
            userId,
            state: "IN_PROGRESS",
            startTime: new Date(),
          },
        });

        // Create conversation and audit log concurrently
        await Promise.all([
          ctx.db.conversation.create({ data: { sessionId: session.id } }),
          ctx.db.auditLog.create({
            data: {
              eventType: "info",
              description: "New session created",
              sessionId: session.id,
              userId,
              associatedId: kioskId,
              associatedType: "kiosk",
            },
          }),
        ]);

        return session;
      } catch (error: unknown) {
        if (error instanceof TRPCError) throw error;
        const errorCause = error instanceof Error ? error : undefined;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create session",
          cause: errorCause,
        });
      }
    }),
});
