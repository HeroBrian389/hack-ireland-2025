"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Pause, Play, X } from "lucide-react";

import { useConversation } from "~/lib/context/ConversationContext";
import { useWebRTC } from "~/lib/hooks/useWebRTC";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

const blankAnalysis = `[Background Analysis] No new hypotheses can be generated from the conversation so far.`;

// Confirmation Dialog Component
interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
}: ConfirmDialogProps) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 flex items-center justify-center z-50">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50"
          onClick={onClose}
        />
        {/* Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-[#020817] p-6 rounded-lg border border-blue-500/20 shadow-xl mx-4"
        >
          <h2 className="text-xl font-semibold mb-2 text-white">{title}</h2>
          <p className="text-gray-300 mb-6">{message}</p>
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-md bg-gray-800 text-white hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="group relative inline-flex items-center justify-center overflow-hidden rounded-md bg-gradient-to-br from-blue-500 to-purple-600 p-0.5 text-sm font-medium text-white hover:text-white focus:outline-none focus:ring-4 focus:ring-blue-800"
            >
              <span className="relative rounded-md bg-[#020817] px-4 py-1.5 transition-all duration-300 ease-in-out group-hover:bg-opacity-0">
                Confirm
              </span>
            </button>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

// Branding & Animated Background
const BoothLogo = () => (
  <svg
    width="40"
    height="40"
    viewBox="0 0 40 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="text-blue-500"
  >
    <motion.path
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 1.5, ease: "easeInOut" }}
      d="M8 8h24v24H8z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      fill="none"
    />
    <motion.path
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 1.5, ease: "easeInOut", delay: 0.3 }}
      d="M12 16h16"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <motion.path
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 1.5, ease: "easeInOut", delay: 0.6 }}
      d="M12 22h16"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <motion.path
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 1.5, ease: "easeInOut", delay: 0.9 }}
      d="M12 28h16"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const Blob = ({
  className,
  scale = 1,
  animate = false,
}: {
  className: string;
  scale?: number;
  animate?: boolean;
}) => (
  <motion.div
    initial={{ scale: 1, opacity: 0.3 }}
    animate={
      animate
        ? {
            scale: [scale, scale * 1.2, scale],
            opacity: [0.3, 0.5, 0.3],
          }
        : {}
    }
    transition={{
      duration: 2,
      repeat: Infinity,
      repeatType: "reverse",
      ease: "easeInOut",
    }}
    className={`absolute h-64 w-64 rounded-full bg-gradient-to-r blur-3xl filter ${className}`}
  />
);

const ControlButton = ({
  icon: Icon,
  onClick,
}: {
  icon: React.ElementType;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className="group relative inline-flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-500 to-purple-600 p-0.5 text-lg font-semibold text-white hover:text-white focus:outline-none focus:ring-4 focus:ring-blue-800"
  >
    <span className="relative flex h-full w-full items-center justify-center rounded-full bg-[#020817] transition-all duration-300 ease-in-out group-hover:bg-opacity-0">
      <Icon className="h-6 w-6" />
    </span>
  </button>
);

// Add these interfaces before the HomePage component
interface UploadResponse {
  success: boolean;
  error?: string;
  results?: Array<{
    filename: string;
    analysis: string;
  }>;
}

// Add this new component before the HomePage component
const FileUploadSection = ({
  files,
  setFiles,
  onUpload,
}: {
  files: FileList | null;
  setFiles: (files: FileList | null) => void;
  onUpload: () => void;
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      setFiles(e.dataTransfer.files);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-xl mx-auto mb-8"
    >
      <div className="relative">
        <div
          className={`
            relative overflow-hidden rounded-xl
            bg-gradient-to-br from-blue-500/10 to-purple-600/10
            backdrop-blur-sm border border-blue-500/20
            transition-all duration-300
            ${isDragging ? 'border-blue-400 bg-blue-500/20' : ''}
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="p-8 text-center">
            <motion.div
              className="mb-4 flex justify-center"
              animate={{
                scale: isDragging ? 1.1 : 1,
              }}
              transition={{ duration: 0.2 }}
            >
              <svg
                className="w-12 h-12 text-blue-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </motion.div>
            
            <h3 className="text-xl font-semibold text-blue-100 mb-2">
              Upload Your Medical Files
            </h3>
            <p className="text-blue-200/80 mb-4">
              Drag and drop your scans or medical images here, or click to browse
            </p>
            
            <input
              type="file"
              multiple
              accept="image/*,.pdf,.dicom"
              onChange={(e) => setFiles(e.target.files)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            
            {files && files.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4"
              >
                <div className="bg-blue-500/10 rounded-lg p-4 backdrop-blur-sm">
                  <h4 className="text-blue-100 font-medium mb-2">
                    Selected Files ({files.length})
                  </h4>
                  <ul className="text-left">
                    {Array.from(files).map((file, index) => (
                      <li
                        key={index}
                        className="text-blue-200/80 text-sm flex items-center gap-2 mb-1"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        {file.name}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <motion.button
                  onClick={onUpload}
                  className="group relative inline-flex items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 p-0.5 text-sm font-semibold text-white hover:text-white focus:outline-none focus:ring-4 focus:ring-blue-800 mt-4 w-full"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="relative rounded-md bg-[#020817] px-6 py-2.5 transition-all duration-300 ease-in-out group-hover:bg-opacity-0 w-full">
                    Upload & Analyze Files
                  </span>
                </motion.button>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default function HomePage() {
  const [isConsultationStarted, setIsConsultationStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [files, setFiles] = useState<FileList | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const blobsRef = useRef<HTMLDivElement>(null);

  // WebRTC and conversation hooks
  const {
    isConnected,
    isLoading,
    error,
    isMuted,
    connect,
    disconnect,
    toggleMic,
    pauseSession,
    resumeSession,
  } = useWebRTC();
  const {
    state: { messages },
  } = useConversation();

  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  
  // Add authentication check
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto connect/disconnect when consultation starts/ends
  useEffect(() => {
    const handleConnection = async () => {
      try {
        if (isConsultationStarted && !isConnected && !isLoading) {
          await connect();
        }
        if (!isConsultationStarted && isConnected) {
          await disconnect();
        }
      } catch (err) {
        console.error("Connection error:", err);
      }
    };

    void handleConnection();
  }, [isConsultationStarted, isConnected, isLoading, connect, disconnect]);

  // Toggle pause/resume for the session
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

  // Blob color style logic
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

  // If auth is still loading or user isn't signed in, don't render the page content
  if (!isLoaded || !isSignedIn) {
    return null;
  }
  // Handle file upload
  const handleUploadFiles = async () => {
    try {
      if (!files || files.length === 0) {
        alert("Please select at least one file first.");
        return;
      }
      const formData = new FormData();
      
      // Use for...of loop for better iteration
      for (const file of Array.from(files)) {
        formData.append("files", file);
      }
      
      const sessionId = "FAKE-SESSION-ID-PRE-CONSULT";
      const response = await fetch(`/api/upload?sessionId=${sessionId}`, {
        method: "POST",
        body: formData,
      });
      
      const result = (await response.json()) as UploadResponse;
      
      if (!result.success) {
        throw new Error(result.error ?? "Unknown error");
      }
      
      console.log("Uploaded and analyzed files:", result.results);
      alert("Files uploaded and analyzed successfully! Check the console for details.");
      setFiles(null);
    } catch (error) {
      console.error("Upload error:", error instanceof Error ? error.message : "Unknown error");
      alert("Failed to upload/analyze files. Check console for error details.");
    }
  };

  return (
    <main className="relative flex min-h-screen flex-col items-center overflow-hidden">
      {/* Animated Blobs Background */}
      <div
        ref={blobsRef}
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
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

      {/* Welcome / Landing View */}
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

              {/* Replace the existing Add Files Section with the new component */}
              <FileUploadSection
                files={files}
                setFiles={setFiles}
                onUpload={handleUploadFiles}
              />

              <motion.button
                onClick={() => setIsConsultationStarted(true)}
                className="group relative inline-flex items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 p-0.5 text-lg font-semibold text-white hover:text-white focus:outline-none focus:ring-4 focus:ring-blue-800"
                transition={{ duration: 1, ease: "easeInOut", delay: 0.4 }}
              >
                <span className="relative rounded-md bg-[#020817] px-8 py-3.5 transition-all duration-300 ease-in-out group-hover:bg-opacity-0">
                  Start Consultation
                </span>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Consultation UI */}
      <AnimatePresence>
        {isConsultationStarted && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="relative z-10 flex h-full w-full max-w-4xl flex-col items-center mx-auto p-4"
          >
            {/* Consultation Header */}
            <div className="flex items-center gap-3 mb-4">
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
                <p className="text-lg text-blue-400">
                  Establishing connection...
                </p>
              ) : error ? (
                <p className="text-lg text-red-400">{error}</p>
              ) : isConnected ? (
                <p className="text-lg text-green-400">Connection established</p>
              ) : (
                <p className="text-lg text-gray-400">Ready to connect</p>
              )}
            </motion.div>

            {/* Messages Container */}
            <div className="flex-1 w-full overflow-y-auto">
              {/* If you have messages to display, handle them here */}
              <div ref={messagesEndRef} />
            </div>

            {/* Control Buttons - Only show when connected */}
            {isConnected && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="sticky bottom-8 mt-8 flex gap-8 justify-center w-full"
              >
                <ControlButton icon={isMuted ? MicOff : Mic} onClick={toggleMic} />
                <ControlButton icon={isPaused ? Play : Pause} onClick={handleTogglePause} />
                <ControlButton icon={X} onClick={() => setIsConfirmDialogOpen(true)} />
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isConfirmDialogOpen}
        onClose={() => setIsConfirmDialogOpen(false)}
        onConfirm={() => {
          setIsConsultationStarted(false);
          disconnect();
        }}
        title="End Consultation"
        message="Are you sure you want to end this consultation? This action cannot be undone."
      />
    </main>
  );
}
