import { conversationRouter } from "~/server/api/routers/conversation-router";
import { adminRouter } from "~/server/api/routers/admin";
import { kioskRouter } from "~/server/api/routers/kiosk-router";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { reasoningRouter } from "./reasoning_bots/reason";
import { pollingrouter } from "./routers/polling";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  conversation: conversationRouter,
  admin: adminRouter,
  kiosk: kioskRouter,
  reasoning_bots: reasoningRouter,
  polling: pollingrouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
