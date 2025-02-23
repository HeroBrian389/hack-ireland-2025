import { motion } from "framer-motion";

interface RhythmicBlobsProps {
  isVisible: boolean;
}

export const RhythmicBlobs = ({ isVisible }: RhythmicBlobsProps) => {
  // Define blob variants for animation
  const blobVariants = {
    hidden: { scale: 0.8, opacity: 0 },
    visible: {
      scale: [0.8, 1.2, 0.8],
      opacity: [0.3, 0.6, 0.3],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
  };

  // Colors for different blobs
  const blobColors = [
    "from-blue-400/30 to-cyan-400/30",
    "from-purple-400/30 to-indigo-400/30",
    "from-cyan-400/30 to-teal-400/30",
  ];

  // Positions and delays for blobs
  const blobConfigs = [
    { left: "30%", delay: 0 },
    { left: "50%", delay: 1 },
    { left: "70%", delay: 2 },
  ];

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-48 left-0 right-0 z-40 h-32 pointer-events-none">
      {blobConfigs.map((config, index) => (
        <motion.div
          key={index}
          className={`absolute bottom-0 h-32 w-32 rounded-full bg-gradient-to-br ${blobColors[index]} blur-xl`}
          style={{ left: config.left }}
          variants={blobVariants}
          initial="hidden"
          animate="visible"
          transition={{
            ...blobVariants.visible.transition,
            delay: config.delay,
          }}
        />
      ))}
    </div>
  );
}; 