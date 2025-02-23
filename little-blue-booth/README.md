## 1. Root Configuration & Setup

### 1.1 **`next.config.js`**

**Path:** `./next.config.js`

**Purpose & Summary:**

- A basic Next.js configuration file.
- Imports a custom `env.js` for environment variables.
- Configures remote image patterns (from S3 bucket in EU-West-1).
- Exports default Next.js config object.

<details>
<summary>Key Points</summary>

- Loads `./src/env.js` at the top, ensuring environment variables are properly validated.
- Sets up `remotePatterns` in `images` config, allowing Next.js Image component to serve images from:
  - `https://health-kiosk.s3.eu-west-1.amazonaws.com`
- Exports an object containing `images` rules as standard Next.js config.
</details>

---

### 1.2 **`next-env.d.ts`**

**Path:** `./next-env.d.ts`

**Purpose & Summary:**

- Auto-generated type definitions for Next.js and its image types.
- Not meant to be edited manually (Next.js overwrites or references it internally).

<details>
<summary>Key Points</summary>

- The file is recognized by the TypeScript compiler to manage Next.js-specific type references.
- Directs the compiler to pick up `next`, `next/image-types/global`, etc.
</details>

---

### 1.3 **`tailwind.config.ts`**

**Path:** `./tailwind.config.ts`

**Purpose & Summary:**

- Tailwind CSS configuration for the entire project.
- Extends default theme with a custom `sans` font (`--font-geist-sans`).
- Specifies content paths to be processed by Tailwind (`./src/**/*.tsx`).

<details>
<summary>Key Points</summary>

- Uses `fontFamily` from `tailwindcss/defaultTheme`.
- Minimal plugin usage (none listed), but easily extendable.
</details>

---

### 1.4 **`postcss.config.js`**

**Path:** `./postcss.config.js`

**Purpose & Summary:**

- PostCSS configuration to run TailwindCSS as a plugin.

<details>
<summary>Key Points</summary>

- Exports default object with `tailwindcss` as the only plugin.
</details>

---

### 1.5 **`prettier.config.js`**

**Path:** `./prettier.config.js`

**Purpose & Summary:**

- Configures Prettier code formatter.
- Includes the `prettier-plugin-tailwindcss` plugin to auto-sort class names.

<details>
<summary>Key Points</summary>

- Informs Prettier to use `tailwindcss` plugin.
- Exports object with `plugins: ["prettier-plugin-tailwindcss"]`.
</details>

---

### 1.6 **`package.json`**

**Path:** `./package.json`

**Purpose & Summary:**

- Lists dependencies, devDependencies, and scripts for the project.
- Key scripts include:
  - `dev`, `build`, `preview`, `start`
  - Database scripts: `db:generate`, `db:migrate`, `db:push`, `db:studio`
  - `lint`, `lint:fix`
  - `format:check`, `format:write`
- Dependencies revolve around Next.js, Prisma, Clerk, AWS SDK, BullMQ, etc.

<details>
<summary>Key Points</summary>

- `type: "module"` indicates ES Modules usage.
- Ties in frameworks: Next.js, Clerk for auth, OpenAI, TanStack Query, TRPC, AWS SDK, `googleapis`, `pdf2pic`, and more.
- “Turbo” usage in dev script: `next dev --turbo`.
- Dev dependencies include `eslint`, `prettier`, `tailwindcss`, etc.
</details>

---

### 1.7 **`tsconfig.json`**

**Path:** `./tsconfig.json`

**Purpose & Summary:**

- TypeScript configuration for the project.
- Targets `ES2022`, uses module resolution type `Bundler`.
- Stricter TypeScript options: `strict`, `checkJs`, `noUncheckedIndexedAccess`.

<details>
<summary>Key Points</summary>

- `skipLibCheck` is `true`, so library definitions are not type-checked as rigorously.
- `plugins: [{ "name": "next" }]` allows Next.js-specific type enhancements.
- Includes `.next/types/**/*.ts` in compilation.
</details>

---

### 1.8 **`.vscode/settings.json`**

**Path:** `./.vscode/settings.json`

**Purpose & Summary:**

- Project-specific VSCode settings.
- Uses Prettier as the default formatter.
- Enables format-on-save.

<details>
<summary>Key Points</summary>

- Simplifies local dev for consistent formatting.
</details>

---

## 2. Prisma & Database

### 2.1 **`prisma/schema.prisma`**

**Path:** `./prisma/schema.prisma`

**Purpose & Summary:**

- Defines the entire database schema using Prisma models.
- Contains models: `Post`, `Kiosk`, `Session`, `Conversation`, `ChatMessage`, `HealthMarker`, `Device`, `DeviceType`, `Recommendation`, `Referral`, `ExternalQuery`, `ExternalResult`, `Media`, `VisionAnalysis`, `ContinualVisionFeed`, `RealtimeSession`, `AuditLog`, `MetaReasoning`, `AnalysisStatus`, `GoogleFitTokens`.

<details>
<summary>Key Models & Notes</summary>

- **Post**: Example model with user-created content.
- **Kiosk**: The “physical kiosk” entity, with location info and `sessions` relationship.
- **Session**: Ties user to kiosk usage session. Has references to conversation, health markers, recommendations, etc.
- **Conversation** & **ChatMessage**: Standard 1-to-many relationship for storing chat messages in a single conversation.
- **HealthMarker**: Stores captured health data (weight, BMI, blood pressure, etc.).
- **Device** & **DeviceType**: For hardware that captures data.
- **Media** & **VisionAnalysis**: For images/videos and their AI-based vision analyses.
- **AnalysisStatus**: Summarizes if we have enough info, next steps, urgency, reasoning, etc.
- **GoogleFitTokens**: Stores OAuth tokens for pulling data from Google Fit. Uses `userId` as unique key.
</details>

---

### 2.2 **`prisma/migrations/20250222212244_init/migration.sql`**

**Path:** `./prisma/migrations/20250222212244_init/migration.sql`

**Purpose & Summary:**

- Initial migration creating all core tables: `Post`, `Kiosk`, `Session`, `Conversation`, `ChatMessage`, `HealthMarker`, `Device`, `DeviceType`, `Recommendation`, `Referral`, `ExternalQuery`, `ExternalResult`, `Media`, `VisionAnalysis`, `ContinualVisionFeed`, `RealtimeSession`, `AuditLog`, `MetaReasoning`, `AnalysisStatus`, `GoogleFitTokens`.
- Creates relevant foreign keys and indexes.

<details>
<summary>Key Points</summary>

- Creates all primary keys, foreign keys referencing other tables (like `Session_kioskId_fkey`, `Conversation_sessionId_fkey`, etc.).
- Includes `CREATE INDEX` statements for optimization (e.g. `Post_name_idx`, `Conversation_sessionId_key`).
</details>

---

### 2.3 **`prisma/migrations/20250222221445_make_analysis_status_fields_optional/migration.sql`**

**Path:** `./prisma/migrations/20250222221445_make_analysis_status_fields_optional/migration.sql`

**Purpose & Summary:**

- Updates `AnalysisStatus` table to allow optional fields.
- Drops and recreates table with updated schema (makes certain text fields optional).

<details>
<summary>Key Points</summary>

- `missingCriticalInfo`, `recommendedNextSteps`, `urgencyLevel`, and `reasoning` become nullable.
- Data is migrated from old table to new table (`INSERT INTO "new_AnalysisStatus" SELECT ...`).
</details>

---

## 3. Scripting & Worker

### 3.1 **`./scripts/worker.ts`**

**Purpose & Summary:**

- Imports and initializes a server worker from `../src/server/api/reasoning_bots/worker`.
- Logs “Worker started” to indicate it’s running.

<details>
<summary>Key Points</summary>

- Used presumably in a CLI or server environment to run background tasks.
</details>

---

## 4. Next.js Middleware & Config

### 4.1 **`./src/middleware.ts`**

**Path:** `./src/middleware.ts`

**Purpose & Summary:**

- Uses `clerkMiddleware` from `@clerk/nextjs/server` to protect routes or handle auth automatically.
- Configures route matchers to skip static assets and Next.js internals, but always run for `/api` and `trpc` routes.

<details>
<summary>Key Points</summary>

- This ensures Clerk authentication can be enforced or used on all dynamic routes.
- It’s the custom Next.js “middleware” functionality.
</details>

---

## 5. Next.js App Directory

### 5.1 **`./src/app/layout.tsx`**

**Purpose & Summary:**

- The global layout file for Next.js.
- Imports global Tailwind styles.
- Wraps the entire app in `<ClerkProvider>`, `<TRPCReactProvider>`, and a custom `<ConversationProvider>` context.
- Renders a top-level navigation, a user button, and includes child pages.

<details>
<summary>Key Points</summary>

- `metadata` for SEO: sets title and description (“Little Blue Booth - Health Kiosk”).
- Large multi-provider structure ensures Clerk auth, tRPC, and conversation context are available to child routes.
</details>

---

### 5.2 **`./src/app/page.tsx`** (The “Home” Page)

**Purpose & Summary:**

- The main kiosk consultation interface.
- Integrates real-time conversation via useWebRTC hooking into an OpenAI GPT-4 real-time model.
- Hooks into Kiosk session logic, file uploads, continuous analysis, etc.
- Renders large amounts of UI components: file uploads, conversation, vision analysis, system control buttons (mic, pause, end consultation, etc.).

<details>
<summary>Key Points</summary>

1. **State & Hooks**:

   - `isConsultationStarted`, `isPaused`, `sessionId`, etc.
   - `useKioskSession` to handle session creation,
   - `useWebRTC` for real-time streaming and conversation,
   - React states for file uploads, insights, analyzed files, etc.

2. **Continuous Analysis**:

   - When user messages appear, it triggers `analyzeMutation` (a TRPC call to queue analysis jobs).
   - On completion, background job data is displayed in `WorkerDataDisplay`.

3. **File Upload & Analysis**:

   - Users can upload PDFs/images.
   - Triggers `/api/upload` route, which calls GPT for summarizing the image/scan, storing results in the DB or returning them immediately for “temp sessions.”

4. **UI**:

   - Show/hide logic for an “Intro” screen vs. the “Consultation” screen.
   - Colorful animated background with “Blobs” and “Pulsing” elements.

5. **Ending the Consultation**:

   - Summaries can be generated, or user can confirm “End Consultation.”
   - Displays a confirm dialog, resets session if confirmed.

6. **Darkly Themed, Heavily Animated**:
   - Framer Motion used extensively for transitions.

</details>

---

### 5.3 **Settings Pages**

#### 5.3.1 **`./src/app/settings/page.tsx`**

**Purpose & Summary:**

- A “Settings” page for connecting external services, specifically Google Fit.
- Renders a `GoogleFitButton` to check or initiate Fit connection.

<details>
<summary>Key Points</summary>

- Uses Framer Motion for page transitions (`AnimatePresence`).
- Basic “Connect your Google Fit” call to action with a custom `GoogleFitButton`.
</details>

---

### 5.4 **Admin Pages**

#### 5.4.1 **`./src/app/admin/layout.tsx`**

**Purpose & Summary:**

- Layout for the entire admin panel.
- Renders a nav bar with links (`Home`, `Users`, `Conversations`, etc.).
- Displays child routes below the nav.

<details>
<summary>Key Points</summary>

- Named export `metadata = { title: "Admin Panel" }`.
- Minimal styling, mostly a container for sub-pages.
</details>

#### 5.4.2 **`./src/app/admin/page.tsx`**

**Purpose & Summary:**

- Basic admin index page: “Welcome, Admin!”
- Tells user to pick a resource from the nav.

#### 5.4.3 **`./src/app/admin/conversations/page.tsx`**

**Purpose & Summary:**

- Renders list of all conversations with messages.
- Uses `api.admin.getAllConversations.useQuery()` from TRPC.
- For each conversation, shows ID, session ID, creation date, and the messages.

<details>
<summary>Key Points</summary>

- Minimal read-only view of `conversation.chatMessages`.
</details>

#### 5.4.4 **`./src/app/admin/users/page.tsx`**

**Purpose & Summary:**

- Renders table of all users from `api.admin.getAllUsers`.
- Show ID, name, email, creation date.

#### 5.4.5 **`./src/app/admin/users/[userId]/page.tsx`**

**Purpose & Summary:**

- Displays single user details from `api.admin.getUserById`.
- Shows email, creation date, and a list of sessions for that user.

---

### 5.5 **`./src/app/test/page.tsx`**

**Purpose & Summary:**

- A “Test” page presumably for debugging or demonstration.
- Renders `TestReasoningAPI`, `TestQueue`, `PollingExample` components for verifying the system’s logic.

<details>
<summary>Key Points</summary>

- Not heavily developed in the snippet, but indicates a playground for queue or reasoning tests.
</details>

---

### 5.6 **`./src/app/tv/page.tsx`**

**Purpose & Summary:**

- A “TV Mode” page that subscribes to socket events via `useTaskSocket`.
- Logs real-time “analysis completed,” “reasoning completed,” etc. to the UI.

<details>
<summary>Key Points</summary>

- Simplified approach for a big screen / “TV” display of ongoing events.
</details>

---

### 5.7 **Session End Pages**

#### 5.7.1 **`./src/app/api/sessions/[sessionId]/end/page.tsx`** (Client Page)

**Purpose & Summary:**

- Client-side page that triggers `POST /api/sessions/[sessionId]` to “finalize” a session, retrieving a final summary.
- Renders disclaimers, marker trends, recommended steps, plus “Email Summary” or “Print/QR” options.

<details>
<summary>Key Points</summary>

- Automatic side effect: calls `fetch(...)` on mount to finalize the session in the backend.
- Displays the returned data in a user-friendly summary format.
</details>

#### 5.7.2 **`./src/app/session/[sessionId]/end/page.tsx`**

**Purpose & Summary:**

- Another variant that fetches `summary` from query params (like `?summary=encodedText`).
- Renders the summary with Markdown, allows user to start a new consultation.

---

## 6. Components

Most are React client components in `./src/app/components/`. They provide UI for modals, file uploads, AI-driven subfeatures, etc.

### 6.1 **`ConfirmDialog.tsx`**

**Purpose & Summary:**

- A reusable confirmation dialog with a “Cancel” and “Confirm” button.
- Uses `Framer Motion` for fade/scale animations.

### 6.2 **`ControlButton.tsx`**

**Purpose & Summary:**

- A stylized circle button that takes a Lucide icon and an `onClick`.
- Used for toggling mic, pausing session, etc.

### 6.3 **`ExtractHealthMetrics.tsx`** & **`ConsultationSummary.tsx`**

**Purpose & Summary:**

- **Empty** or minimal placeholders in the snippet. Possibly future expansions for AI tasks.

### 6.4 **`RhythmicBlobs.tsx`**

**Purpose & Summary:**

- Animated “blobs” that scale, fade, move in rhythmic patterns on the screen.

### 6.5 **`BoothLogo.tsx`**

**Purpose & Summary:**

- SVG-based brand/logo with Framer Motion path animations (like drawing squares, lines).

### 6.6 **`PulsingBlob.tsx`**

**Purpose & Summary:**

- Another stylized blob animation that can appear/dismiss based on `isVisible`.

### 6.7 **`InsightsList.tsx`**

**Purpose & Summary:**

- Renders “AI Insights” items on the right side. Each item has a small preview, can show an extended popover on hover.

### 6.8 **`AnalysisStatus.tsx`**

**Purpose & Summary:**

- Displays a small card indicating if the conversation is analyzing or if there's an error, with the last analysis timestamp.

### 6.9 **`VideoRecorder.tsx`**

**Purpose & Summary:**

- Captures camera images every few seconds to call `/api/video_analysis`.
- Submits the screenshot as a `file`, receives a description from OpenAI, then sends it back into the conversation stream.

<details>
<summary>Key Points</summary>

- `handleTakeScreenshot()` uses a `<canvas>` to draw the video image, then transforms it into a `base64` image to post to the server.
- The server route uses an OpenAI chat call to describe the image in a medical context.
</details>

### 6.10 **`Blob.tsx`**

**Purpose & Summary:**

- Another single “blob” with animated scaling, rotation, and gradient shifts.

### 6.11 **`FilePreviewLightbox.tsx`**

**Purpose & Summary:**

- A modal/lightbox for displaying a single file preview (image) with an analysis summary.
- Positions an overlay & an X close button.

### 6.12 **`FileUploadSection.tsx`**

**Purpose & Summary:**

- Drag-and-drop or click file uploading area.
- Displays file list with “Processing” or “Complete” states.
- On file drop, calls `onUpload(files)`.

### 6.13 **`WorkerDataDisplay.tsx`**

**Purpose & Summary:**

- Displays aggregated health metrics extracted by background jobs (like BMI, weight, BP).
- Tracks updates from queue polling in real time.

### 6.14 **`SessionIdDisplay.tsx`**

**Purpose & Summary:**

- A floating motion-based label in bottom-left corner showing the current `sessionId`.

### 6.15 **`AnalyzedFilesList.tsx`**

**Purpose & Summary:**

- Shows a list of files that have been run through AI analysis.
- On hover, displays small image popover preview.
- On click, opens a `FilePreviewLightbox`.

### 6.16 **`WorkerStatus.tsx`**

**Purpose & Summary:**

- A minimal readout for whether the background worker polling is currently in a loading/polling state.

### 6.17 **`Navigation.tsx`**

**Purpose & Summary:**

- A corner-floating button that toggles between linking to “Settings” or going “Back to Home.”
- Icon changes with a neat Framer Motion rotation.

### 6.18 **`GoogleFitButton.tsx`**

**Purpose & Summary:**

- Button that initiates Google Fit OAuth or indicates if we’re connected.
- On success, shows success state; on error, shows error state.

---

## 7. API Routes

### 7.1 **`./src/app/api/tavily-search/route.ts`**

**Purpose & Summary:**

- Demonstration of hooking to the Tavily search API with zod validation.
- Takes a JSON body containing `query`, `searchDepth`, `topic`, etc., calls `tavily.search(...)`, returns result.

### 7.2 **`./src/app/api/trpc/[trpc]/route.ts`**

**Purpose & Summary:**

- The Next.js “edge” route for all tRPC calls.
- Binds `appRouter` to `fetchRequestHandler` with a dynamic `[trpc]` path.
- Ties into `createTRPCContext`.

### 7.3 **`./src/app/api/google-fit/route.ts` & `callback/route.ts`**

**Purpose & Summary:**

- Two routes:

  1. **GET**: generates Google Fit auth URL (which includes `userId` in state).
  2. **POST**: retrieves user’s Google Fit data if connected.

- The `callback` route handles the OAuth code exchange, storing tokens in DB.

### 7.4 **`./src/app/api/presigned-url/route.ts`**

**Purpose & Summary:**

- Takes `location` param (S3 file path).
- Generates a short-lived presigned GET URL from S3 to access that file.

### 7.5 **`./src/app/api/video_analysis/route.ts`**

**Purpose & Summary:**

- Receives form-data with a single `file` field (the snapshot).
- Calls OpenAI (fake example with “gpt-4o-mini” usage) to describe the image in a medical context, returns the descriptive text in JSON.

### 7.6 **`./src/app/api/sessions/[sessionId]/route.ts`**

**Purpose & Summary:**

- A `POST` endpoint that calls `caller.session.endSession()` from the tRPC layer.
- Returns a final summary object.

### 7.7 **`./src/app/api/reasoning-bots/*`** (Big chunk for conversation + queue processing)

#### 7.7.1 **`/reason.ts`**

**Purpose & Summary:**

- tRPC router with endpoints:
  - `analyzeConversation`: Queues up analysis jobs using `createJobsFromConversation`.
  - `pollJobStatus`: Returns the status of each job from the queue.

#### 7.7.2 **`/analyse_data.ts`**

**Purpose & Summary:**

- A small direct function that queries an OpenAI instance with a specialized prompt for “3 most likely hypotheses” + questions.

#### 7.7.3 **`/queue.ts`**

**Purpose & Summary:**

- BullMQ setup for 3 queues: `conversationQueue`, `analysisQueue`, `reasoningQueue`.
- Exports a function `setSocketIO` to attach a socket instance.
- Has `processConversationTask`, `processAnalysisTask`, `processReasoningTask` for each queue’s logic.
- Emits socket events on each step.

#### 7.7.4 **`/bull_mq_process.ts`**

**Purpose & Summary:**

- Another queue definition named `myQueue = new Queue("analysisQueue")`.
- The main worker is declared via `new Worker(...)` that processes jobs by name:
  - `roughOverview`, `extractHealthMetrics`, `checkInformationCompleteness`, `generateSummary`.
- Functions for each step, e.g., `runRoughOverview`, `runHealthMetricsExtraction`, etc.
- Also references the DB with Prisma to store or retrieve data (health markers, analysis statuses).

### 7.8 **`./src/app/api/generate-summary/*`**

**Purpose & Summary:**

- Two routes: `route.ts` and `poll.ts` used for a separate “summary generation” job.
- `route.ts`: receives a `sessionId`, enqueues `generateSummary` job in `myQueue`.
- `poll.ts`: polls the job for completion, returning “status: completed” plus final summary or an error.

### 7.9 **`./src/app/api/upload/route.ts`**

**Purpose & Summary:**

- Handles multi-file uploads (images/PDFs).
- If PDF, converts pages to images via `pdf2pic`, then calls S3 upload on each page.
- Summaries each uploaded file with GPT. Stores them in `Media` and optional `VisionAnalysis`.

---

## 8. TRPC & Server

### 8.1 **`./src/trpc/`**

- Houses React query client & server for TRPC.

#### 8.1.1 **`query-client.ts`**

**Purpose & Summary:**

- Creates a new `QueryClient` from TanStack Query with default options (like `staleTime`).
- Integrates `SuperJSON.serialize` in the dehydration config.

#### 8.1.2 **`react.tsx`**

**Purpose & Summary:**

- Exports `api = createTRPCReact<AppRouter>();`
- Wraps the app in a `QueryClientProvider` + `<api.Provider>` for client usage.

#### 8.1.3 **`server.ts`**

**Purpose & Summary:**

- Next.js 13 RSC support for tRPC – creates a server-side `caller` instance and RSC hydration helpers.

### 8.2 **`./src/server/api/root.ts`**

**Purpose & Summary:**

- Main `appRouter` combining child routers: `conversationRouter`, `adminRouter`, `kioskRouter`, `reasoning_bots`, `polling`, `session`.
- Exports `createCaller` to facilitate server-side calls.

### 8.3 **`./src/server/api/trpc.ts`**

**Purpose & Summary:**

- Contains `initTRPC` config with `superjson` transformer, error formatter, context creation from clerk auth, etc.
- Export `publicProcedure`, `protectedProcedure`, and `createTRPCRouter`.

### 8.4 **`./src/server/api/routers/*`**

- Each file is a sub-router in the TRPC system:

1. **`conversation-router.ts`**: minimal “addMessage” mutation.
2. **`admin.ts`**: “protectedProcedure” routes for listing users, conversations, etc. Could enforce admin checks as needed.
3. **`kiosk-router.ts`**: logic to get or create kiosk, and create sessions with optional Google Fit data.
4. **`session-router.ts`**: the `endSession` mutation for finalizing a session, returning disclaimers and trends.
5. **`session-utils.ts`**: helper to parse health markers and produce simple “trend” objects.
6. **`polling.ts`**: a router that gets completed jobs from the queue to be displayed.

---

## 9. Server Utilities & Workers

### 9.1 **`./src/server/utils/s3.ts`**

**Purpose & Summary:**

- Creates an S3 client with AWS credentials from env.
- `uploadToS3(bucket, key, body, mimeType)` is a helper to store files in S3.

### 9.2 **`./src/server/utils/pdfToImages.ts`**

**Purpose & Summary:**

- Uses `pdf2pic` to convert each PDF page to a PNG.
- Uploads each PNG to S3 with `uploadToS3`.
- Returns array of final S3 URLs.

### 9.3 **`./src/server/workers.ts`**

**Purpose & Summary:**

- Worker process entrypoint that imports “worker” and “scheduler” from `bull_mq_process`.
- Gracefully shuts down on SIGTERM or SIGINT.

---

## 10. Env & Database Config

### 10.1 **`./src/env.js`**

**Purpose & Summary:**

- Uses `@t3-oss/env-nextjs` with `zod` to strictly validate environment variables (server & client).
- Contains `DATABASE_URL`, `CLERK_SECRET_KEY`, `OPENAI_API_KEY`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `GOOGLE_CLIENT_ID`, `TAVILY_API_KEY`, etc.

### 10.2 **`./src/server/db.ts`**

**Purpose & Summary:**

- Instantiates a `PrismaClient` for the entire app.
- In dev, attaches a global to avoid multiple Prisma instances.

---

## 11. Hooks & Context

### 11.1 **`useTaskSocket.ts`**

**Purpose & Summary:**

- Manages `Socket.IO` connection to receive real-time queue updates (analysis completed, reasoning completed, etc.).
- `onConversationProcessed`, `onAnalysisCompleted`, `onReasoningCompleted` callbacks for external usage.

### 11.2 **`useGoogleFit.ts`**

**Purpose & Summary:**

- Fetches user’s Google Fit data from `/api/google-fit` if connected.
- Tracks `isLoading`, `isConnected`, data, and error states.

### 11.3 **`useKioskSession.ts`**

**Purpose & Summary:**

- Abstracts the kiosk + session creation flow using TRPC `kiosk` router.
- `startSession(userId)`, `ensureSession(userId)`, and `clearSession()`.
- Exposes `sessionId`, `kioskId`, `error` states.

### 11.4 **`useWebRTC.ts`**

**Purpose & Summary:**

- The core hook that sets up real-time streaming to OpenAI’s GPT-4 Realtime endpoint.
- Configures a local `RTCPeerConnection`, `DataChannel`, audio track streaming, listening for conversation events.
- Handles `transcription.completed`, `response.done` events, triggers function calls (`medical_reasoning`).

### 11.5 **`ConversationContext.tsx`**

**Purpose & Summary:**

- Provides a global context for storing chat messages (`messages` array).
- Exposes `addMessage(role, content)` and `clearMessages()`.
- Some logic to also store messages to DB with `api.conversation.addMessage` mutation.

---

## 12. Services

### 12.1 **`googleFitService.ts`**

**Purpose & Summary:**

- Provides utility to generate Google Fit OAuth URL, handle callback token exchange, and fetch user’s Fit data using `googleapis`.
- Stores tokens in `GoogleFitTokens` table, refreshes as needed.
