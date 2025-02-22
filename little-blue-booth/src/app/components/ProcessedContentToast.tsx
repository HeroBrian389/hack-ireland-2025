"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";

interface ProcessedContent {
  id: string;
  content: string;
}

interface ProcessedContentToastProps {
  content: ProcessedContent;
  onComplete: (id: string) => void;
}

export const ProcessedContentToast = ({
  content,
  onComplete,
}: ProcessedContentToastProps) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete(content.id);
    }, 3000); // auto-remove after 3 seconds
    return () => clearTimeout(timer);
  }, [content.id, onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 50 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="mb-4 w-full max-w-md rounded-lg border border-blue-500/20 bg-[#020817] p-4 shadow-lg"
    >
      <p className="text-sm text-blue-200">{content.content}</p>
    </motion.div>
  );
};
