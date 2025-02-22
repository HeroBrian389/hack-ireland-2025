"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Pause, Play, X } from "lucide-react";

// ────────────────────────────
//  Hooks / Context
// ────────────────────────────
import { useConversation } from "~/lib/context/ConversationContext";
import { useWebRTC } from "~/lib/hooks/useWebRTC";
import { useKioskSession } from "~/lib/hooks/useKioskSession";
import { api } from "~/trpc/react";

// ────────────────────────────
//  Components
// ────────────────────────────
import { BoothLogo } from "~/app/components/BoothLogo";
import { Blob } from "~/app/components/Blob";
import { ConfirmDialog } from "~/app/components/ConfirmDialog";
import { ControlButton } from "~/app/components/ControlButton";
import { FileUploadSection } from "~/app/components/FileUploadSection";
import { SessionIdDisplay } from "~/app/components/SessionIdDisplay";
import { ProcessedContentToast } from "~/app/components/ProcessedContentToast";
import { WorkerStatus } from "~/app/components/WorkerStatus";
import { AnalysisStatus } from "~/app/components/AnalysisStatus";
import type { UserAssistantMessage, WorkerJob } from "~/lib/types";

// ────────────────────────────
//  Types (adjust paths as needed)
// ────────────────────────────
// Example: If you have a global types file or store them in a `types.ts`:


export default function HomePage() {
  // ─────────────────────────────────────
  // Local state and refs
  // ─────────────────────────────────────
  const [isConsultationStarted, setIsConsultationStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [files, setFiles] = useState<FileList | null>(null);
  const [lastAnalysisTimestamp, setLastAnalysisTimestamp] = useState<string | null>(null);
  const [workerIds, setWorkerIds] = useState<string[]>([]);
  const [processedContents, setProcessedContents] = useState<
    { id: string; content: string }[]
  >([]);

  // ─────────────────────────────────────
  // Hooks
  // ─────────────────────────────────────
  const { isConnected, isLoading, error: webRTCError, isMuted, connect, disconnect,
          toggleMic, pauseSession, resumeSession, sendMessage } = useWebRTC();

  const { isSignedIn, isLoaded, userId } = useAuth();
  const router = useRouter();

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  // Use the kiosk session hook
  // Kiosk session (start/clear)
  const { startSession, clearSession, isCreatingSession, error, sessionId } =
    useKioskSession({
      onSessionCreated: () => setIsConsultationStarted(true),
      onError: () => setIsConsultationStarted(false),
    });

  // Conversation context
  const {
    state: { messages },
  } = useConversation();

  // Polling worker data
  const { data: workerData, isLoading: isPollingLoading } = api.polling.polling.useQuery<
    WorkerJob[]
  >(undefined, {
    refetchInterval: 2000,
    refetchIntervalInBackground: true,
    enabled: isConsultationStarted, // poll only if consultation is active
  });

  // Analyze conversation
  const analyzeMutation = api.reasoning_bots.analyzeConversation.useMutation({
    onSuccess(data) {
      if (data?.workerIds?.length) {
        setWorkerIds((prev) => [...prev, ...data.workerIds]);
      }
    },
  });

  // Poll job statuses
  const { data: jobStatuses } = api.reasoning_bots.pollJobStatus.useQuery(
    { jobIds: workerIds },
    {
      enabled: workerIds.length > 0,
      refetchInterval: 2000,
    }
  );

  // ─────────────────────────────────────
  // Refs
  // ─────────────────────────────────────
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastAnalyzedMessageRef = useRef<{ timestamp: string; content: string } | null>(
    null
  );

  // ─────────────────────────────────────
  // Effects: Connection + Auto-Scroll
  // ─────────────────────────────────────

  // Auto-scroll when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Connect/disconnect on consultation start/end
  useEffect(() => {
    const handleConnection = async () => {
      try {
        if (isConsultationStarted && !isConnected && !isLoading) {
          await connect();
        } else if (!isConsultationStarted && isConnected) {
          disconnect();
        }
      } catch (err) {
        console.error("Connection error:", err);
      }
    };
    void handleConnection();
  }, [isConsultationStarted, isConnected, isLoading, connect, disconnect]);

  // ─────────────────────────────────────
  // Continuous Analysis Effect
  // ─────────────────────────────────────
  useEffect(() => {
    const performContinuousAnalysis = async () => {
      if (messages.length === 0) return;

      const lastMessage = messages[messages.length - 1];

      // Skip if:
      //   1. Not a user message
      //   2. Already analyzed it
      //   3. It's a system/analysis result
      if (
        lastMessage?.role !== "user" ||
        lastMessage.content.includes("[Background Analysis]") ||
        (lastAnalyzedMessageRef.current?.timestamp === lastMessage.timestamp &&
          lastAnalyzedMessageRef.current?.content === lastMessage.content)
      ) {
        return;
      }

      // Mark it to prevent re-analysis
      lastAnalyzedMessageRef.current = {
        timestamp: lastMessage.timestamp,
        content: lastMessage.content,
      };

      // Filter out system messages
      const conversationForAnalysis = messages
        .filter((msg): msg is UserAssistantMessage =>
          msg.role === "user" || msg.role === "assistant"
        )
        .map(({ role, content }) => ({ role, content }));

      try {
        const result = await analyzeMutation.mutateAsync(conversationForAnalysis);
        if (result?.workerIds?.length) {
          setWorkerIds((prev) => [...prev, ...result.workerIds]);
        }
      } catch (error) {
        console.error("Analysis request failed:", error);
      }
    };

    // Debounce if consultation is active & not paused
    if (isConsultationStarted && !isPaused) {
      const timeoutId = setTimeout(() => {
        void performContinuousAnalysis();
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [messages, isConsultationStarted, isPaused, analyzeMutation]);

  // ─────────────────────────────────────
  // Handle completed jobs (jobStatuses)
  // ─────────────────────────────────────
  useEffect(() => {
    if (!jobStatuses) return;

    // Completed jobs
    const completedJobs = jobStatuses.filter(
      (js) => js.status === "completed" && js.data?.processed
    );

    if (completedJobs.length > 0) {
      completedJobs.forEach((job) => {
        if (job.data?.processed && typeof job.data.processed === "string") {
          // Timestamp
          const currentTimestamp = new Date().toISOString();
          setLastAnalysisTimestamp(currentTimestamp);

          // Show toast
          setProcessedContents((prev) => [
            ...prev,
            {
              id: job.jobId,
              content: job.data.processed as string,
            },
          ]);

          // Send the analysis message into conversation
          sendMessage({
            type: "response.create",
            response: {
              modalities: ["text"],
              instructions: `[Background Analysis] ${job.data.processed}`,
            },
          });
        }
      });

      // Remove completed job IDs from workerIds to avoid infinite polling
      setWorkerIds((prev) =>
        prev.filter((id) => !completedJobs.find((job) => job.jobId === id))
      );
    }
  }, [jobStatuses, sendMessage]);

  // ─────────────────────────────────────
  // Event Handlers
  // ─────────────────────────────────────

  const handleStartConsultation = async () => {
    if (!userId) return;
    await startSession(userId);
  };

  const handleEndConsultation = () => {
    setIsConsultationStarted(false);
    clearSession();
    disconnect();
  };

  const handleTogglePause = async () => {
    try {
      if (!isPaused) {
        await pauseSession();
        setIsPaused(true);
      } else {
        await resumeSession();
        setIsPaused(false);
      }
    } catch (err) {
      console.error("Failed to toggle pause/resume:", err);
    }
  };

  // If auth is still loading or user isn't signed in, don't render the page content
  if (!isLoaded || !isSignedIn) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-blue-500">Loading...</h2>
        </div>
      </main>
    );
  }
  // Handle file upload
  const handleUploadFiles = async () => {
    try {
      if (!files || files.length === 0) {
        alert("Please select at least one file first.");
        return;
      }
      const formData = new FormData();
      for (const file of Array.from(files)) {
        formData.append("files", file);
      }

      // If you have an actual sessionId, use it here
      const fakeSessionId = "FAKE-SESSION-ID-PRE-CONSULT";
      const response = await fetch(`/api/upload?sessionId=${fakeSessionId}`, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error ?? "Unknown error");
      }

      console.log("Uploaded and analyzed files:", result.results);
      alert("Files uploaded and analyzed successfully! Check the console for details.");
      setFiles(null);
    } catch (error) {
      console.error(
        "Upload error:",
        error instanceof Error ? error.message : "Unknown error"
      );
      alert("Failed to upload/analyze files. Check console for error details.");
    }
  };

  // ─────────────────────────────────────
  // Animated background color logic
  // ─────────────────────────────────────
  const blobStyle = isPaused
    ? {
        blob1: "from-yellow-500/30 to-orange-500/30",
        blob2: "translate-x-[25%] translate-y-[25%] from-yellow-500/30 to-orange-500/30",
        blob3: "-translate-x-[25%] -translate-y-[25%] from-yellow-500/30 to-orange-500/30",
      }
    : isMuted
    ? {
        blob1: "from-gray-500/30 to-gray-700/30",
        blob2: "translate-x-[25%] translate-y-[25%] from-gray-500/30 to-gray-700/30",
        blob3: "-translate-x-[25%] -translate-y-[25%] from-gray-500/30 to-gray-700/30",
      }
    : {
        blob1: "from-blue-500/30 to-purple-500/30",
        blob2: "translate-x-[25%] translate-y-[25%] from-indigo-500/30 to-cyan-500/30",
        blob3: "-translate-x-[25%] -translate-y-[25%] from-violet-500/30 to-blue-500/30",
      };

  // ─────────────────────────────────────
  // If Auth is not loaded or user not signed in, return null
  // ─────────────────────────────────────
  if (!isLoaded || !isSignedIn) {
    return null;
  }

  // ─────────────────────────────────────
  // Render
  // ─────────────────────────────────────
  return (
    <main className="relative flex min-h-screen flex-col items-center overflow-hidden">
      {/* Error message if kiosk session has an error */}
      {error && (
        <div className="absolute left-1/2 top-4 z-50 -translate-x-1/2 transform rounded-lg bg-red-500/90 px-4 py-2 text-white">
          {error}
        </div>
      )}

      {/* Worker & Analysis Status (top-right corner) */}
      {isConsultationStarted && (
        <div className="absolute right-4 top-4 z-50 space-y-4">
          <WorkerStatus workerData={workerData} isPollingLoading={isPollingLoading} />
          <AnalysisStatus
            isAnalyzing={analyzeMutation.isPending}
            analysisError={analyzeMutation.isError ? analyzeMutation.error.message : null}
            lastAnalysisTimestamp={lastAnalysisTimestamp}
          />
        </div>
      )}

      {/* Animated Blob Background */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <Blob
          className={blobStyle.blob1}
          scale={isLoading ? 1.2 : 1}
          animate={isLoading || isPaused || isMuted}
        />
        <Blob
          className={blobStyle.blob2}
          scale={isLoading ? 1.3 : 1}
          animate={isLoading || isPaused || isMuted}
        />
        <Blob
          className={blobStyle.blob3}
          scale={isLoading ? 1.1 : 1}
          animate={isLoading || isPaused || isMuted}
        />
      </div>

      {/* Landing / Welcome View */}
      <AnimatePresence mode="wait">
        {!isConsultationStarted && (
          <motion.div
            initial={{ opacity: 1, y: 0 }}
            exit={{
              opacity: 0,
              y: -100,
              transition: { duration: 1.2, ease: "easeInOut" },
            }}
            className="relative z-10 flex flex-1 items-center justify-center"
          >
            <div className="text-center">
              <motion.h1
                className="mb-8 text-6xl font-bold tracking-tight text-white"
                transition={{ duration: 1, ease: "easeInOut" }}
              >
                Little Blue Booth
              </motion.h1>
              <motion.p
                className="mb-12 text-xl text-blue-200"
                transition={{ duration: 1, ease: "easeInOut", delay: 0.2 }}
              >
                Your personal health consultation companion
              </motion.p>

              {/* File Upload Section */}
              <FileUploadSection files={files} setFiles={setFiles} onUpload={handleUploadFiles} />

              <motion.button
                onClick={handleStartConsultation}
                className="group relative inline-flex items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 p-0.5 text-lg font-semibold text-white hover:text-white focus:outline-none focus:ring-4 focus:ring-blue-800"
                transition={{ duration: 1, ease: "easeInOut", delay: 0.4 }}
              >
                <span className="relative rounded-md bg-[#020817] px-8 py-3.5 transition-all duration-300 ease-in-out group-hover:bg-opacity-0">
                  {isCreatingSession ? "Starting..." : "Start Consultation"}
                </span>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Session ID Display */}
      <AnimatePresence>
        <SessionIdDisplay sessionId={sessionId} isVisible={isConsultationStarted} />
      </AnimatePresence>

      {/* Main Consultation UI */}
      <AnimatePresence>
        {isConsultationStarted && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="relative z-10 mx-auto flex h-full w-full max-w-4xl flex-col items-center p-4"
          >
            {/* Header */}
            <div className="mb-4 flex items-center gap-3">
              <BoothLogo />
              <span className="text-xl font-semibold text-blue-500">
                Little Blue Booth
              </span>
            </div>

            {/* Connection Status */}
            <motion.div
              className="mb-8 text-center"
              animate={{
                scale: isLoading ? [1, 1.05, 1] : 1,
                opacity: isLoading ? [0.5, 1, 0.5] : 1,
              }}
              transition={{
                duration: 2,
                repeat: isLoading ? Infinity : 0,
                repeatType: "reverse",
              }}
            >
              {isLoading ? (
                <p className="text-lg text-blue-400">Establishing connection...</p>
              ) : webRTCError ? (
                <p className="text-lg text-red-400">{webRTCError}</p>
              ) : isConnected ? (
                <p className="text-lg text-green-400">Connection established</p>
              ) : (
                <p className="text-lg text-gray-400">Ready to connect</p>
              )}
            </motion.div>

            {/* Messages Container */}
            <div className="w-full flex-1 overflow-y-auto">
              {/* Render your messages here, e.g. map over messages */}
              <div ref={messagesEndRef} />
            </div>

            {/* Control Buttons */}
            {isConnected && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="sticky bottom-8 mt-8 flex w-full justify-center gap-8"
              >
                <ControlButton icon={isMuted ? MicOff : Mic} onClick={toggleMic} />
                <ControlButton icon={isPaused ? Play : Pause} onClick={handleTogglePause} />
                <ControlButton icon={X} onClick={() => setIsConfirmDialogOpen(true)} />
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* End Consultation Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isConfirmDialogOpen}
        onClose={() => setIsConfirmDialogOpen(false)}
        onConfirm={handleEndConsultation}
        title="End Consultation"
        message="Are you sure you want to end this consultation? This action cannot be undone."
      />

      {/* Processed Content Toasts */}
      <AnimatePresence>
        <div className="fixed right-4 top-40 z-50 space-y-4">
          {processedContents.map((content) => (
            <ProcessedContentToast
              key={content.id}
              content={content}
              onComplete={(id: string) =>
                setProcessedContents((prev) => prev.filter((c) => c.id !== id))
              }
            />
          ))}
        </div>
      </AnimatePresence>
    </main>
  );
}
