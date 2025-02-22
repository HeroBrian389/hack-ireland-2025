"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Pause, X, LucideIcon } from "lucide-react";

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

const Blob = ({ className }: { className?: string }) => {
  return (
    <div
      className={`absolute h-64 w-64 rounded-full bg-gradient-to-r blur-3xl filter ${className}`}
    />
  );
};

const ControlButton = ({ 
  icon: Icon, 
  onClick 
}: { 
  icon: LucideIcon; 
  onClick?: () => void 
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

export default function HomePage() {
  const [isConsultationStarted, setIsConsultationStarted] = useState(false);
  const blobsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const blobs = blobsRef.current?.children;
    if (!blobs) return;

    const animateBlobs = () => {
      Array.from(blobs).forEach((blob, index) => {
        const x = 40 * Math.sin(Date.now() * 0.0005 + index * 0.5);
        const y = 40 * Math.cos(Date.now() * 0.0005 + index * 0.5);
        blob.setAttribute(
          "style",
          `transform: translate(${x}px, ${y}px); transition: transform 1s ease-in-out;`,
        );
      });
      requestAnimationFrame(animateBlobs);
    };

    animateBlobs();
  }, []);

  const containerVariants = {
    exit: {
      opacity: 0,
      y: -100,
      transition: {
        duration: 1.2,
        ease: "easeInOut",
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    initial: { opacity: 0, y: 0 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -50 },
  };

  const buttonVariants = {
    initial: { scale: 0, opacity: 0 },
    animate: (i: number) => ({
      scale: 1,
      opacity: 1,
      transition: {
        delay: i * 0.3,
        duration: 0.8,
        ease: "easeOut",
      },
    }),
  };

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden">
      {/* Animated blobs */}
      <div
        ref={blobsRef}
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        <Blob className="from-blue-500/30 to-purple-500/30" />
        <Blob className="translate-x-[25%] translate-y-[25%] from-indigo-500/30 to-cyan-500/30" />
        <Blob className="-translate-x-[25%] -translate-y-[25%] from-violet-500/30 to-blue-500/30" />
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {!isConsultationStarted && (
          <motion.div
            variants={containerVariants}
            initial={{ opacity: 1, y: 0 }}
            exit="exit"
            className="relative z-10 text-center"
          >
            <motion.h1 
              variants={itemVariants}
              transition={{ duration: 1, ease: "easeInOut" }}
              className="mb-8 text-6xl font-bold tracking-tight text-white"
            >
              Little Blue Booth
            </motion.h1>
            <motion.p 
              variants={itemVariants}
              transition={{ duration: 1, ease: "easeInOut", delay: 0.2 }}
              className="mb-12 text-xl text-blue-200"
            >
              Your personal health consultation companion
            </motion.p>
            <motion.button
              variants={itemVariants}
              transition={{ duration: 1, ease: "easeInOut", delay: 0.4 }}
              onClick={() => setIsConsultationStarted(true)}
              className="group relative inline-flex items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 p-0.5 text-lg font-semibold text-white hover:text-white focus:outline-none focus:ring-4 focus:ring-blue-800"
            >
              <span className="relative rounded-md bg-[#020817] px-8 py-3.5 transition-all duration-300 ease-in-out group-hover:bg-opacity-0">
                Start Consultation
              </span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Consultation Mode Branding */}
      <AnimatePresence>
        {isConsultationStarted && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.5, ease: "easeOut", delay: 1 }}
            className="absolute top-8 left-8 z-10 flex items-center gap-3"
          >
            <BoothLogo />
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1, ease: "easeOut", delay: 2 }}
              className="text-xl font-semibold text-blue-500"
            >
              Little Blue Booth
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Control Buttons */}
      <AnimatePresence>
        {isConsultationStarted && (
          <motion.div 
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: "easeOut", delay: 0.8 }}
            className="absolute bottom-12 z-10 flex gap-8"
          >
            <motion.div variants={buttonVariants} custom={0} initial="initial" animate="animate">
              <ControlButton icon={Mic} />
            </motion.div>
            <motion.div variants={buttonVariants} custom={1} initial="initial" animate="animate">
              <ControlButton icon={Pause} />
            </motion.div>
            <motion.div variants={buttonVariants} custom={2} initial="initial" animate="animate">
              <ControlButton icon={X} onClick={() => setIsConsultationStarted(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
