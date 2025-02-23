import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { randomUUID } from "crypto";
import { getFitData } from "~/services/googleFitService";

const createSessionSchema = z.object({
  kioskId: z.string().uuid(),
  userId: z.string(),
});

export const kioskRouter = createTRPCRouter({
  getOrCreateKiosk: publicProcedure.query(async ({ ctx }) => {
    // Try to find an active kiosk first (in a real app, you might have logic to find the nearest one)
    const activeKiosk = await ctx.db.kiosk.findFirst({
      where: { status: "ACTIVE" },
      select: { id: true },
    });

    if (activeKiosk) {
      return activeKiosk;
    }

    // If no active kiosk found, create a new one
    const newKiosk = await ctx.db.kiosk.create({
      data: {
        id: randomUUID(),
        status: "ACTIVE",
      },
      select: { id: true },
    });

    return newKiosk;
  }),

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
        // End the existing session
        await ctx.db.session.update({
          where: { id: activeSession.id },
          data: {
            state: "COMPLETED",
            endTime: new Date(),
          },
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

        // Create conversation, audit log, and fetch Google Fit data concurrently
        await Promise.all([
          ctx.db.conversation.create({ data: { sessionId: session.id } }),
          ctx.db.auditLog.create({
            data: {
              eventType: "info",
              description: activeSession
                ? "New session created (previous session ended)"
                : "New session created",
              sessionId: session.id,
              userId,
              associatedId: kioskId,
              associatedType: "kiosk",
            },
          }),
          // Fetch and store Google Fit data
          (async () => {
            try {
              console.log(`[GoogleFit] Fetching data for user ${userId}`);
              const fitData = await getFitData(userId);
              console.log(
                "[GoogleFit] Received data:",
                JSON.stringify(fitData, null, 2),
              );
              if (!fitData) {
                console.log("[GoogleFit] No data returned");
                return;
              }

              // Create health markers for each metric
              const healthMarkerPromises = [];
              console.log("[GoogleFit] Creating health markers...");

              if (fitData.bmi !== null) {
                console.log("[GoogleFit] Adding BMI marker:", fitData.bmi);
                healthMarkerPromises.push(
                  ctx.db.healthMarker.create({
                    data: {
                      sessionId: session.id,
                      markerType: "bmi",
                      data: JSON.stringify({ value: fitData.bmi }),
                    },
                  }),
                );
              }

              if (fitData.height !== null) {
                healthMarkerPromises.push(
                  ctx.db.healthMarker.create({
                    data: {
                      sessionId: session.id,
                      markerType: "height",
                      data: JSON.stringify({ value: fitData.height }),
                    },
                  }),
                );
              }

              if (fitData.weight !== null) {
                healthMarkerPromises.push(
                  ctx.db.healthMarker.create({
                    data: {
                      sessionId: session.id,
                      markerType: "weight",
                      data: JSON.stringify({ value: fitData.weight }),
                    },
                  }),
                );
              }

              if (fitData.heartRate !== null) {
                healthMarkerPromises.push(
                  ctx.db.healthMarker.create({
                    data: {
                      sessionId: session.id,
                      markerType: "heartRate",
                      data: JSON.stringify({ value: fitData.heartRate }),
                    },
                  }),
                );
              }

              if (fitData.bloodPressure !== null) {
                healthMarkerPromises.push(
                  ctx.db.healthMarker.create({
                    data: {
                      sessionId: session.id,
                      markerType: "bloodPressure",
                      data: JSON.stringify({
                        systolic: fitData.bloodPressure.systolic,
                        diastolic: fitData.bloodPressure.diastolic,
                      }),
                    },
                  }),
                );
              }

              if (fitData.bloodOxygen !== null) {
                healthMarkerPromises.push(
                  ctx.db.healthMarker.create({
                    data: {
                      sessionId: session.id,
                      markerType: "bloodOxygen",
                      data: JSON.stringify({ value: fitData.bloodOxygen }),
                    },
                  }),
                );
              }

              // Create all health markers
              await Promise.all(healthMarkerPromises);
            } catch (error) {
              // Log the error but don't fail session creation
              console.error("Failed to fetch/store Google Fit data:", error);
              await ctx.db.auditLog.create({
                data: {
                  eventType: "warning",
                  description: "Failed to fetch Google Fit data",
                  details:
                    error instanceof Error ? error.message : "Unknown error",
                  sessionId: session.id,
                  userId,
                },
              });
            }
          })(),
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
