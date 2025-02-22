"use client";

import { motion } from "framer-motion";

interface BlobProps {
  className: string;
  scale?: number;
  animate?: boolean;
}

export const Blob = ({ className, scale = 1, animate = false }: BlobProps) => (
  <motion.div
    initial={false}
    animate={{
      scale: animate ? [scale, scale * 1.1, scale] : scale,
      opacity: animate ? [0.3, 0.4, 0.3] : 0.3,
      rotate: animate ? [0, 5, -5, 0] : 0,
    }}
    transition={{
      duration: 8,
      repeat: Infinity,
      repeatType: "reverse",
      ease: "easeInOut",
      opacity: {
        duration: 4,
      },
      rotate: {
        duration: 6,
      },
    }}
    className={`h-[20rem] w-[20rem] rounded-[999px] bg-gradient-to-r blur-3xl filter ${className}`}
    style={{
      backgroundSize: "200% 200%",
      animation: animate ? "gradient 15s ease infinite" : "none",
      transform: `translate(-50%, -50%)`,
      willChange: "transform, opacity",
    }}
  />
);
