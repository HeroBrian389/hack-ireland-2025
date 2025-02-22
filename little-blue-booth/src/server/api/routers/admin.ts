import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

/**
 * If you want to enforce an `isAdmin` check, add a small middleware or inline
 * check below. E.g. if your `User` table had an `isAdmin` boolean field, do:
 *
 *   if (!ctx.session.user.isAdmin) {
 *     throw new TRPCError({ code: "UNAUTHORIZED" });
 *   }
 *
 * For simplicity, we skip that and just show `protectedProcedure`, which ensures
 * the user is logged in. Customize as needed.
 */

export const adminRouter = createTRPCRouter({
  // Example: fetch all users
  getAllUsers: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.user.findMany({
      orderBy: { createdAt: "desc" },
    });
  }),

  // Example: fetch all conversations
  getAllConversations: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.conversation.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        chatMessages: true,
        session: {
          include: {
            healthMarkers: {
              include: {
                device: true
              }
            },
            recommendations: true,
            referrals: true,
            externalQueries: {
              include: {
                externalResults: true
              }
            },
            medias: {
              include: {
                visionAnalyses: true
              }
            },
            metaReasonings: true,
            realtimeSessions: true,
            auditLogs: true,
            continualFeeds: true,
            kiosk: true
          }
        }
      }
    });
  }),

  // Example: fetch a single user by ID
  getUserById: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.user.findUnique({
        where: { id: input.userId },
        include: {
          // e.g. show related sessions, accounts, etc.
          sessions: true,
          accounts: true,
        },
      });
    }),

  // Add more queries (and/or mutations) for the various data models
});
