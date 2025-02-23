"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Pause, Play, X, Check, Video } from "lucide-react";

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
import { WorkerDataDisplay } from "~/app/components/WorkerDataDisplay";
import { AnalysisStatus } from "~/app/components/AnalysisStatus";
import { AnalyzedFilesList } from "~/app/components/AnalyzedFilesList";
import { InsightsList } from "~/app/components/InsightsList";
import type { UserAssistantMessage } from "~/lib/types";
import type { JobState } from "bullmq";
import { PulsingBlob } from "~/app/components/PulsingBlob";
import type { WebRTCEvent } from "~/lib/hooks/useWebRTC";
import VideoRecorder from "~/app/components/VideoRecorder";
import { RhythmicBlobs } from "~/app/components/RhythmicBlobs";

// ────────────────────────────
//  Types (adjust paths as needed)
// ────────────────────────────
// Example: If you have a global types file or store them in a `types.ts`:

interface WorkerJobData {
  processed: string;
  [key: string]: unknown;
}

interface WorkerJob {
  jobId: string;
  status: string;
  data: WorkerJobData;
}

// Define the API types
interface JobData {
  processed: boolean;
  data: string;
}

interface JobResult {
  jobId: string;
  status: JobState | "not_found";
  data: JobData | null;
}

// Add this interface near the top with other interfaces
interface AnalyzedFile {
  filename: string;
  analysis: string;
  timestamp: string;
}

interface Insight {
  id: string;
  content: string;
  timestamp: string;
}

// Add these types near the top of the file with other interfaces
interface GenerateSummaryResponse {
  summary: string;
  error?: string;
  jobId: string;
}

interface PollSummaryResponse {
  status: "pending" | "completed" | "failed" | "not_found";
  summaryContent?: string;
  error?: string;
}

export default function HomePage() {
  // ─────────────────────────────────────
  // Local state and refs
  // ─────────────────────────────────────
  const [isConsultationStarted, setIsConsultationStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [files, setFiles] = useState<FileList | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [lastAnalysisTimestamp, setLastAnalysisTimestamp] = useState<
    string | null
  >(null);
  const [workerIds, setWorkerIds] = useState<string[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [analyzedFiles, setAnalyzedFiles] = useState<AnalyzedFile[]>([]);
  const [isAssistantSpeaking, setIsAssistantSpeaking] = useState(false);
  const [summaryJobId, setSummaryJobId] = useState<string | null>(null);
  const [summaryMarkdown, setSummaryMarkdown] = useState<string | null>(null);
  const [isCheckingSummary, setIsCheckingSummary] = useState(false);

  // ─────────────────────────────────────
  // Hooks
  // ─────────────────────────────────────
  const {
    isConnected,
    isLoading,
    error: webRTCError,
    isMuted,
    connect,
    disconnect,
    toggleMic,
    pauseSession,
    resumeSession,
    sendMessage,
    isConnecting,
  } = useWebRTC();

  const { isSignedIn, isLoaded, userId } = useAuth();
  const { user } = useUser();
  const router = useRouter();

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  // Use the kiosk session hook
  const {
    startSession,
    clearSession,
    ensureSession,
    isCreatingSession,
    error,
    sessionId,
  } = useKioskSession({
    onSessionCreated: () => setIsConsultationStarted(true),
    onError: () => setIsConsultationStarted(false),
  });

  // Conversation context
  const {
    state: { messages },
  } = useConversation();

  // Polling worker data
  const { data: workerData, isLoading: isPollingLoading } =
    api.polling.polling.useQuery(
      { workerIds },
      {
        refetchInterval: 2000,
        refetchIntervalInBackground: true,
        enabled: isConsultationStarted && workerIds.length > 0,
      },
    );

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
    },
  );

  // ─────────────────────────────────────
  // Refs
  // ─────────────────────────────────────
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastAnalyzedMessageRef = useRef<{
    timestamp: string;
    content: string;
  } | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);

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
        // Only attempt to connect if we're not already connected or in the process of connecting
        if (
          isConsultationStarted &&
          !isConnected &&
          !isLoading &&
          !isConnecting
        ) {
          await connect();
        } else if (!isConsultationStarted && isConnected) {
          disconnect();
        }
      } catch (err) {
        console.error("Connection error:", err);
      }
    };
    void handleConnection();
  }, [
    isConsultationStarted,
    isConnected,
    isLoading,
    isConnecting,
    connect,
    disconnect,
  ]);

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
        .filter(
          (msg): msg is UserAssistantMessage =>
            msg.role === "user" || msg.role === "assistant",
        )
        .map(({ role, content }) => ({ role, content }));

      try {
        const result = await analyzeMutation.mutateAsync({
          messages: conversationForAnalysis,
          sessionId: sessionId ?? "",
        });
        if (result?.workerIds?.length) {
          setWorkerIds((prev) => [...prev, ...result.workerIds]);
        }
      } catch (err) {
        console.error("Analysis request failed:", err);
      }
    };

    // Debounce if consultation is active & not paused
    if (isConsultationStarted && !isPaused) {
      const timeoutId = setTimeout(() => {
        void performContinuousAnalysis();
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [messages, isConsultationStarted, isPaused, analyzeMutation, sessionId]);

  // ─────────────────────────────────────
  // Effects: Handle completed jobs
  // ─────────────────────────────────────
  useEffect(() => {
    if (!jobStatuses) return;

    // Completed jobs
    const completedJobs = jobStatuses
      .filter((js): js is JobResult => {
        if (js.status !== "completed" || !js.data) return false;
        const jobData = js.data as JobData;
        return jobData.processed === true && typeof jobData.data === "string";
      })
      .map((job) => ({
        ...job,
        data: job.data!
      }));

    if (completedJobs.length > 0) {
      completedJobs.forEach((job) => {
        const analysisData = job.data.data;

        // Timestamp
        const currentTimestamp = new Date().toISOString();
        setLastAnalysisTimestamp(currentTimestamp);

        
        // Add to insights
        setInsights((prev) => [
          ...prev,
          {
            id: job.jobId,
            content: analysisData,
            timestamp: currentTimestamp,
          },
        ]);

        // Send the analysis message into conversation
        sendMessage({
          type: "response.create",
          response: {
            modalities: ["text"],
            instructions: `[Background Analysis] ${analysisData}`,
          },
        });
      });

      // Remove completed job IDs from workerIds
      setWorkerIds((prev) =>
        prev.filter((id) => !completedJobs.find((job) => job.jobId === id)),
      );
    }
  }, [jobStatuses, sendMessage]);

  // ─────────────────────────────────────
  // Summary Generation
  // ─────────────────────────────────────
  const handleGenerateSummary = async () => {
    if (!sessionId) return;
    try {
      setIsCheckingSummary(true);

      // Filter out system messages and format conversation
      const conversationForSummary = messages
        .filter(
          (msg): msg is UserAssistantMessage =>
            msg.role === "user" || msg.role === "assistant",
        )
        .map(({ role, content }) => ({ role, content }));

      // 1) Call the route to spawn the job
      const res = await fetch("/api/generate-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation: conversationForSummary }),
      });
      const data = (await res.json()) as GenerateSummaryResponse;
      if (!data.summary) {
        throw new Error(data.error ?? "Failed to start summary job");
      }
      
      
      const checkHeartCondition = async () => {
        const response = await fetch('http://localhost:3000/api/check_heart', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: data.summary
          })
        });
        const res = await response.json();

        if (res.isHeartAttack === true) {
          router.push('http://localhost:3000/emergency_number');
        }
        else {
          router.push('http://localhost:3000/end?summary=' + encodeURIComponent(data.summary));
        }
      };
      checkHeartCondition();
      
      setSummaryJobId(data.jobId);

      // 2) Poll for job completion
      let polling = true;
      let attempts = 0;
      while (polling && attempts < 30) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const pollRes = await fetch("/api/generate-summary/poll", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobId: data.jobId }),
        });
        const pollData = (await pollRes.json()) as PollSummaryResponse;
        if (pollData.status === "completed" && pollData.summaryContent) {
          setSummaryMarkdown(pollData.summaryContent);
          polling = false;
        } else if (
          pollData.status === "failed" ||
          pollData.status === "not_found"
        ) {
          throw new Error(pollData.error ?? "Summary job failed or not found");
        }
        attempts++;
      }
    } catch (err) {
      console.error("Error generating summary:", err);
    } finally {
      setIsCheckingSummary(false);
    }
  };

  // Add effect to handle summary navigation
  useEffect(() => {
    if (summaryMarkdown) {

      router.push(`/end?summary=${encodeURIComponent(summaryMarkdown)}`);
    }
  }, [summaryMarkdown, router]);

  // ─────────────────────────────────────
  // Event Handlers
  // ─────────────────────────────────────

  const handleStartConsultation = async () => {
    if (!userId || !user) return;

    // Construct the full name, ensuring both first and last name exist
    const fullName = [user.firstName, user.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();

    // Log the name being used
    console.debug("[HomePage] Starting consultation with name:", fullName);

    if (!fullName) {
      console.warn("[HomePage] No name available from Clerk user profile");
    }

    await startSession(userId);
    await connect(fullName);
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

  // Add this handler near other handlers
  const handleFileClick = (file: AnalyzedFile) => {
    if (!isConsultationStarted) return;

    sendMessage({
      type: "response.create",
      response: {
        modalities: ["text"],
        instructions: `[File Analysis] ${file.filename}: ${file.analysis}`,
      },
    });
  };

  // Modify the handleUploadFiles function
  const handleUploadFiles = async (uploadFiles: FileList) => {
    try {
      if (uploadFiles.length === 0) return;

      if (!userId) {
        setUploadError("Please sign in to upload files");
        return;
      }

      setIsUploading(true);
      setUploadError(null);

      const formData = new FormData();
      for (const file of Array.from(uploadFiles)) {
        formData.append("files", file);
      }

      const uploadSessionId = sessionId ?? `temp_${userId}_${Date.now()}`;
      const response = await fetch(`/api/upload?sessionId=${uploadSessionId}`, {
        method: "POST",
        body: formData,
      });

      const result = (await response.json()) as {
        success: boolean;
        error?: string;
        results?: Array<{
          filename: string;
          analysis: string;
          mediaId: string;
          storageLocation?: string;
          presignedUrl?: string;
        }>;
      };

      if (!result.success) {
        throw new Error(result.error ?? "Failed to upload and analyze files");
      }

      // Store analysis results with timestamp
      if (result.results?.length) {
        const timestamp = new Date().toISOString();
        const newAnalyzedFiles = result.results.map(
          ({ filename, analysis, storageLocation, presignedUrl }) => ({
            filename,
            analysis,
            timestamp,
            storageLocation,
            presignedUrl,
          }),
        );

        setAnalyzedFiles((prev) => [...prev, ...newAnalyzedFiles]);

        // If consultation is active, send to conversation immediately
        if (isConsultationStarted) {
          newAnalyzedFiles.forEach(({ filename, analysis }) => {
            sendMessage({
              type: "response.create",
              response: {
                modalities: ["text"],
                instructions: `[File Analysis] ${filename}: ${analysis}`,
              },
            });
          });
        }
      }

      setFiles(null);
    } catch (error) {
      console.error("Upload error:", error);
      setUploadError(
        error instanceof Error ? error.message : "Failed to upload files",
      );
    } finally {
      setIsUploading(false);
    }
  };

  // Add effect to handle sending stored analyses when consultation starts
  useEffect(() => {
    if (isConsultationStarted && analyzedFiles.length > 0) {
      analyzedFiles.forEach(({ filename, analysis }) => {
        sendMessage({
          type: "response.create",
          response: {
            modalities: ["text"],
            instructions: `[File Analysis] ${filename}: ${analysis}`,
          },
        });
      });
    }
  }, [isConsultationStarted]); // eslint-disable-line react-hooks/exhaustive-deps

  // Add this effect after other useEffect hooks
  useEffect(() => {
    const handleAssistantSpeaking = (e: MessageEvent<string>) => {
      try {
        const event = JSON.parse(e.data) as WebRTCEvent;
        if (
          typeof event === "object" &&
          event !== null &&
          "type" in event &&
          event.type === "conversation.item.created" &&
          event.item?.role === "assistant"
        ) {
          setIsAssistantSpeaking(true);
          // Reset after a short delay to account for potential pauses in speech
          setTimeout(() => setIsAssistantSpeaking(false), 500);
        }
      } catch (error) {
        console.error("Error handling assistant speaking event:", error);
      }
    };

    const channel = dataChannelRef.current;
    if (channel) {
      channel.addEventListener("message", handleAssistantSpeaking);
      return () => {
        channel.removeEventListener("message", handleAssistantSpeaking);
      };
    }
  }, []);

  // ─────────────────────────────────────
  // Animated background color logic
  // ─────────────────────────────────────
  const blobStyle = isPaused
    ? {
        blob1: "left-[20%] top-[30%] from-yellow-500/30 to-orange-500/30",
        blob2: "left-[80%] top-[70%] from-yellow-500/30 to-orange-500/30",
        blob3: "left-[70%] top-[20%] from-yellow-500/30 to-orange-500/30",
        blob4: "left-[30%] top-[80%] from-amber-500/30 to-yellow-500/30",
        blob5: "left-[85%] top-[40%] from-orange-500/30 to-red-500/30",
        blob6: "left-[40%] top-[50%] from-yellow-600/20 to-amber-400/20",
      }
    : isMuted
      ? {
          blob1: "left-[20%] top-[30%] from-gray-500/30 to-gray-700/30",
          blob2: "left-[80%] top-[70%] from-gray-500/30 to-gray-700/30",
          blob3: "left-[70%] top-[20%] from-gray-500/30 to-gray-700/30",
          blob4: "left-[30%] top-[80%] from-gray-600/30 to-gray-800/30",
          blob5: "left-[85%] top-[40%] from-gray-400/30 to-gray-600/30",
          blob6: "left-[40%] top-[50%] from-gray-500/20 to-gray-700/20",
        }
      : {
          blob1: "left-[20%] top-[30%] from-blue-500/30 to-purple-500/30",
          blob2: "left-[80%] top-[70%] from-indigo-500/30 to-cyan-500/30",
          blob3: "left-[70%] top-[20%] from-violet-500/30 to-blue-500/30",
          blob4: "left-[30%] top-[80%] from-cyan-400/30 to-teal-500/30",
          blob5: "left-[85%] top-[40%] from-fuchsia-500/30 to-pink-500/30",
          blob6: "left-[40%] top-[50%] from-blue-600/20 to-indigo-400/20",
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
        <div className="absolute right-4 w-64 top-20 z-50 space-y-4">
          <WorkerDataDisplay 
            workerData={workerData?.map(worker => ({
              id: worker.id!,
              data: worker.data
            }))} 
            jobStatuses={jobStatuses?.map(status => ({
              jobId: status.jobId,
              status: status.status,
              data: status.data ? {
                processed: true,
                data: Array.isArray(status.data) ? status.data : undefined
              } : null
            }))} 
            isPollingLoading={isPollingLoading} 
          />
        </div>
      )}

      {/* Animated Blob Background */}
      <div className="pointer-events-none fixed inset-0 h-screen w-screen overflow-hidden">
        <motion.div
          className="absolute inset-0"
          initial={false}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Blob
            className={`absolute ${blobStyle.blob1} z-10`}
            scale={1}
            animate={true}
          />
          <Blob
            className={`absolute ${blobStyle.blob2} z-20`}
            scale={1.1}
            animate={true}
          />
          <Blob
            className={`absolute ${blobStyle.blob3} z-30`}
            scale={0.9}
            animate={true}
          />
          <Blob
            className={`absolute ${blobStyle.blob4} z-10`}
            scale={1.2}
            animate={true}
          />
          <Blob
            className={`absolute ${blobStyle.blob5} z-20`}
            scale={1}
            animate={true}
          />
          <Blob
            className={`absolute ${blobStyle.blob6} z-30`}
            scale={1.3}
            animate={true}
          />
        </motion.div>
      </div>

      {/* Landing / Welcome View */}
      <AnimatePresence mode="wait">
        {!isConsultationStarted && (
          <motion.div
            initial={{ opacity: 0, y: 0 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -100 }}
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
              <FileUploadSection
                files={files}
                setFiles={setFiles}
                onUpload={handleUploadFiles}
                isProcessing={isUploading}
                processedFiles={
                  new Set(analyzedFiles.map((file) => file.filename))
                }
              />
              {uploadError && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-4 text-red-400"
                >
                  {uploadError}
                </motion.p>
              )}

              <div className="flex flex-col items-center gap-4">
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Session ID Display */}
      <AnimatePresence>
        <SessionIdDisplay
          sessionId={sessionId}
          isVisible={isConsultationStarted}
        />
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
            <motion.div
              className="mb-4 flex items-center gap-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
            >
              <motion.div
                initial={{ y: "50vh", scale: 2 }}
                animate={{ y: "2vh", scale: 1 }}
                transition={{
                  duration: 1.2,
                  ease: "easeInOut",
                }}
                className="relative flex items-center gap-3"
              >
                <BoothLogo />
                <span className="text-xl font-semibold text-blue-500">
                  Little Blue Booth
                </span>
              </motion.div>
            </motion.div>

            {/* Connection Status */}
            <motion.div
              className="fixed bottom-0 mb-8 text-center"
              // animate={{
              //   scale: isLoading ? [1, 1.05, 1] : 1,
              //   opacity: isLoading ? [0.5, 1, 0.5] : 1,
              // }}
              transition={{
                duration: 2,
                repeat: isLoading ? Infinity : 0,
                repeatType: "reverse",
              }}
            >
              {isLoading ? (
                <p className="text-lg text-blue-400">
                  Establishing connection...
                </p>
              ) : webRTCError ? (
                <p className="text-lg text-red-400">{webRTCError}</p>
              ) : isConnected ? (
                <p className="text-base text-gray-400">
                  Connection established
                </p>
              ) : (
                <p className="text-lg text-gray-400">Ready to connect</p>
              )}
            </motion.div>

            {/* Messages Container */}
            <div className="w-full flex-1 overflow-y-auto">
              {/* Render your messages here, e.g. map over messages */}
              <div ref={messagesEndRef} />
            </div>

            {/* Vision Analysis Panel */}
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              className="mx-auto mt-20 w-full max-w-md"
            >
              <VideoRecorder sendMessage={sendMessage} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Control Buttons - Moved outside the container */}
      <AnimatePresence>
        {isConsultationStarted && isConnected && (
          <>
            <PulsingBlob
              isVisible={isAssistantSpeaking}
              className="fixed bottom-[30%] left-1/2 -translate-x-1/2 -translate-y-[70%]"
            />
            <RhythmicBlobs isVisible={true} />
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed inset-x-0 top-[75%] z-50 mx-auto flex w-fit -translate-y-[75%] items-center justify-center gap-8"
            >
              <ControlButton
                icon={isMuted ? MicOff : Mic}
                onClick={toggleMic}
              />
              <ControlButton
                icon={isPaused ? Play : Pause}
                onClick={handleTogglePause}
              />
              <ControlButton
                icon={X}
                onClick={() => setIsConfirmDialogOpen(true)}
              />
              <ControlButton
                icon={Check}
                onClick={handleGenerateSummary}
                disabled={isCheckingSummary}
                className={isCheckingSummary ? "opacity-50" : ""}
              />
            </motion.div>
          </>
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

      {/* Add InsightsList */}
      <AnimatePresence>
        {isConsultationStarted && insights.length > 0 && (
          <InsightsList insights={insights} />
        )}
      </AnimatePresence>

      {/* Add the AnalyzedFilesList component near the top of the return statement */}
      <AnimatePresence>
        {analyzedFiles.length > 0 && (
          <AnalyzedFilesList
            files={analyzedFiles}
            onFileClick={handleFileClick}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
