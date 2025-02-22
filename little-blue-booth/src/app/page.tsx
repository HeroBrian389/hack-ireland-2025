"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Pause, Play, X } from "lucide-react";

import { useConversation } from "~/lib/context/ConversationContext";
import { useWebRTC } from "~/lib/hooks/useWebRTC";

const blankAnalysis = `[Background Analysis] No new hypotheses can be generated from the conversation so far.`;

// Confirmation Dialog Component
interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

const ConfirmDialog = ({ isOpen, onClose, onConfirm, title, message }: ConfirmDialogProps) => (
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

const Blob = ({ className, scale = 1, animate = false }) => (
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

const ControlButton = ({ icon: Icon, onClick }) => (
  <button
    onClick={onClick}
    className="group relative inline-flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-500 to-purple-600 p-0.5 text-lg font-semibold text-white hover:text-white focus:outline-none focus:ring-4 focus:ring-blue-800"
  >
    <span className="relative flex h-full w-full items-center justify-center rounded-full bg-[#020817] transition-all duration-300 ease-in-out group-hover:bg-opacity-0">
      <Icon className="h-6 w-6" />
    </span>
  </button>
);

export default function HomePage() {
  const [isConsultationStarted, setIsConsultationStarted] = useState(false);
  const [message, setMessage] = useState("");
  const [isPaused, setIsPaused] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const blobsRef = useRef(null);

  // WebRTC and conversation hooks
  const {
    isConnected,
    isLoading,
    error,
    isMuted,
    connect,
    disconnect,
    sendMessage,
    toggleMic,
    pauseSession,
    resumeSession,
  } = useWebRTC();
  const {
    state: { messages },
  } = useConversation();

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto connect/disconnect when consultation starts/ends
  useEffect(() => {
    if (isConsultationStarted && !isConnected && !isLoading) {
      connect();
    }
    if (!isConsultationStarted && isConnected) {
      disconnect();
    }
  }, [isConsultationStarted, isConnected, isLoading, connect, disconnect]);

  // Send a message to the conversation
  const handleSendMessage = () => {
    if (message.trim()) {
      sendMessage({
        type: "response.create",
        response: { modalities: ["text"], instructions: message },
      });
      setMessage("");
    }
  };

  // Toggle pause/resume for the session and update the UI
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

  // Determine blob styles based on current state (paused > muted > normal)
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
                <p className="text-lg text-green-400">
                  Connection established
                </p>
              ) : (
                <p className="text-lg text-gray-400">Ready to connect</p>
              )}
            </motion.div>

            {/* Messages Container */}
            <div className="flex-1 w-full overflow-y-auto">
              {/* Your messages content here */}
            </div>

            {/* Control Buttons - Only show when connected */}
            {isConnected && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="sticky bottom-8 mt-8 flex gap-8 justify-center w-full"
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
