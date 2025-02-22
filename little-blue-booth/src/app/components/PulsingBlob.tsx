import { motion } from "framer-motion";

interface PulsingBlobProps {
  isVisible: boolean;
  className: string;
}

export const PulsingBlob = ({ isVisible, className }: PulsingBlobProps) => {
  if (!isVisible) return null;

  return (
    <motion.div
      className={`absolute z-50 h-32 w-32 rounded-full bg-gradient-to-r from-blue-500/30 to-purple-500/30 blur-xl ${className}`}
      initial={{ scale: 0.8, opacity: 0.5 }}
      animate={{
        scale: [0.8, 1.2, 0.8],
        opacity: [0.5, 0.8, 0.5],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
}; 