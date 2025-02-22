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
      <div className="fixed inset-0 z-50 flex items-center justify-center">
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
          className="relative mx-4 w-full max-w-md rounded-lg border border-blue-500/20 bg-[#020817] p-6 shadow-xl"
        >
          <h2 className="mb-2 text-xl font-semibold text-white">{title}</h2>
          <p className="mb-6 text-gray-300">{message}</p>
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="rounded-md bg-gray-800 px-4 py-2 text-white transition-colors hover:bg-gray-700"
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

// File Upload Section Component
interface UploadResponse {
  success: boolean;
  error?: string;
  results?: Array<{
    filename: string;
    analysis: string;
  }>;
}

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
      className="mx-auto mb-8 w-full max-w-xl"
    >
      <div className="relative">
        <div
          className={`relative overflow-hidden rounded-xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-purple-600/10 backdrop-blur-sm transition-all duration-300 ${isDragging ? "border-blue-400 bg-blue-500/20" : ""} `}
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
                className="h-12 w-12 text-blue-500"
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

            <h3 className="mb-2 text-xl font-semibold text-blue-100">
              Upload Your Medical Files
            </h3>
            <p className="mb-4 text-blue-200/80">
              Drag and drop your scans or medical images here, or click to
              browse
            </p>

            <input
              type="file"
              multiple
              accept="image/*,.pdf,.dicom"
              onChange={(e) => setFiles(e.target.files)}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />

            {files && files.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4"
              >
                <div className="rounded-lg bg-blue-500/10 p-4 backdrop-blur-sm">
                  <h4 className="mb-2 font-medium text-blue-100">
                    Selected Files ({files.length})
                  </h4>
                  <ul className="text-left">
                    {Array.from(files).map((file, index) => (
                      <li
                        key={index}
                        className="mb-1 flex items-center gap-2 text-sm text-blue-200/80"
                      >
                        <svg
                          className="h-4 w-4"
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
                  className="group relative mt-4 inline-flex w-full items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 p-0.5 text-sm font-semibold text-white hover:text-white focus:outline-none focus:ring-4 focus:ring-blue-800"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="relative w-full rounded-md bg-[#020817] px-6 py-2.5 transition-all duration-300 ease-in-out group-hover:bg-opacity-0">
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

// New WebcamFeed Component for Video Functionality
const WebcamFeed = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  useEffect(() => {
    if (isCameraActive && videoRef.current) {
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: false })
        .then((stream) => {
          videoRef.current!.srcObject = stream;
          videoRef.current!.play();
        })
        .catch((error) => {
          console.error("❌ Error accessing the camera:", error);
        });
    } else {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
    }
  }, [isCameraActive]);

  const startCamera = () => setIsCameraActive(true);
  const stopCamera = () => setIsCameraActive(false);

  const sendImageToServer = async (imageDataUrl: string) => {
    try {
      const blob = await fetch(imageDataUrl).then((res) => res.blob());
      const formData = new FormData();
      formData.append("image", blob, "capture.png");

      // ✅ Correct URL - No `.ts` or `route`
      const response = await fetch("/api/handle_image", {
        method: "POST",
        body: formData,
      });

      if (!response.ok)
        throw new Error(`HTTP error! Status: ${response.status}`);

      const data = await response.json();
      console.log("📤 Server Response:", data);
    } catch (error) {
      console.error("❌ Error sending image:", error);
    }
  };

  const takePicture = async () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      if (context) {
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

        const imageUrl = canvas.toDataURL("image/png");

        console.log("📸 Captured Image Data URL:", imageUrl);

        setCapturedImage(imageUrl);
        await sendImageToServer(imageUrl); // ✅ Ensure it's awaited
      }
    }
  };

  useEffect(() => {
    let isRunning = false;

    const intervalId = setInterval(async () => {
      if (isRunning) return;
      isRunning = true;

      try {
        await takePicture(); // ✅ Ensure `takePicture()` is awaited
      } catch (error) {
        console.error("❌ Error capturing image:", error);
      } finally {
        isRunning = false;
      }
    }, 5000);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="text-center">
      <div className="flex justify-center gap-4">
        {isCameraActive ? (
          <button
            className="rounded-md bg-red-500 px-4 py-2 text-white"
            onClick={stopCamera}
          >
            Stop Camera
          </button>
        ) : (
          <button
            className="rounded-md bg-green-500 px-4 py-2 text-white"
            onClick={startCamera}
          >
            Start Camera
          </button>
        )}
        {isCameraActive && (
          <button
            className="rounded-md bg-blue-500 px-4 py-2 text-white"
            onClick={takePicture}
          >
            Take Picture
          </button>
        )}
      </div>

      {isCameraActive && (
        <div className="mt-2">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full rounded-md"
          />
        </div>
      )}

      <canvas ref={canvasRef} className="hidden"></canvas>

      {capturedImage && (
        <div className="mt-4">
          <h3 className="text-white">Captured Image:</h3>
          <img
            src={capturedImage}
            alt="Captured"
            className="rounded-md border border-gray-300"
          />
          <a
            href={capturedImage}
            download="captured_image.png"
            className="mt-2 block rounded-md bg-blue-600 px-4 py-2 text-white"
          >
            Download Image
          </a>
        </div>
      )}
    </div>
  );
};

// export default WebcamFeed;

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
        blob2:
          "translate-x-[25%] translate-y-[25%] from-yellow-500/30 to-orange-500/30",
        blob3:
          "-translate-x-[25%] -translate-y-[25%] from-yellow-500/30 to-orange-500/30",
      }
    : isMuted
      ? {
          blob1: "from-gray-500/30 to-gray-700/30",
          blob2:
            "translate-x-[25%] translate-y-[25%] from-gray-500/30 to-gray-700/30",
          blob3:
            "-translate-x-[25%] -translate-y-[25%] from-gray-500/30 to-gray-700/30",
        }
      : {
          blob1: "from-blue-500/30 to-purple-500/30",
          blob2:
            "translate-x-[25%] translate-y-[25%] from-indigo-500/30 to-cyan-500/30",
          blob3:
            "-translate-x-[25%] -translate-y-[25%] from-violet-500/30 to-blue-500/30",
        };

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
      alert(
        "Files uploaded and analyzed successfully! Check the console for details.",
      );
      setFiles(null);
    } catch (error) {
      console.error(
        "Upload error:",
        error instanceof Error ? error.message : "Unknown error",
      );
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

              {/* File Upload Section */}
              <FileUploadSection
                files={files}
                setFiles={setFiles}
                onUpload={handleUploadFiles}
              />

              {/* New WebcamFeed Section */}
              {/* <WebcamFeed /> */}

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
            className="relative z-10 mx-auto flex h-full w-full max-w-4xl flex-col items-center p-4"
          >
            {/* Consultation Header */}
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
            <div className="w-full flex-1 overflow-y-auto">
              {/* Display messages here */}
              <div ref={messagesEndRef} />
            </div>

            {/* Control Buttons - Only show when connected */}
            {isConnected && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="sticky bottom-8 mt-8 flex w-full justify-center gap-8"
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
                <WebcamFeed />
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
