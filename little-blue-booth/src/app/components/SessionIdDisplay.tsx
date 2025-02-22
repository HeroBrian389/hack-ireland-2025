"use client";

import { motion, AnimatePresence } from "framer-motion";

interface SessionIdDisplayProps {
  sessionId: string | null;
  isVisible: boolean;
}

export const SessionIdDisplay = ({ sessionId, isVisible }: SessionIdDisplayProps) => {
  if (!sessionId || !isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-4 left-4 z-50"
      >
        <motion.div
          className="rounded-md border border-blue-500/20 bg-[#020817] px-3 py-1.5 text-sm font-medium text-blue-400 shadow-lg"
          whileHover={{ scale: 1.05 }}
        >
          Session ID: {sessionId}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
