"use client";

import { motion } from "framer-motion";

interface BlobProps {
  className: string;
  scale?: number;
  animate?: boolean;
}

export const Blob = ({ className, scale = 1, animate = false }: BlobProps) => (
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
