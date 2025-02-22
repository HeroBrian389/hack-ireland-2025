"use client";

import { GoogleFitButton } from "~/components/GoogleFitButton";
import { motion, AnimatePresence } from "framer-motion";

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      when: "beforeChildren",
      staggerChildren: 0.1,
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.2,
      when: "afterChildren",
      staggerChildren: 0.05,
      staggerDirection: -1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3 },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: { duration: 0.2 },
  },
};

export default function SettingsPage() {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        className="container mx-auto px-4 py-8"
        initial="hidden"
        animate="visible"
        exit="exit"
        variants={containerVariants}
      >
        <motion.h1
          className="mb-8 text-2xl font-bold text-white"
          variants={itemVariants}
        >
          Settings
        </motion.h1>

        <motion.h2
          className="mb-4 text-xl font-semibold text-white"
          variants={itemVariants}
        >
          Connected Services
        </motion.h2>

        <motion.div
          className="rounded-lg border border-gray-800 bg-gray-900/50 p-6 shadow-lg backdrop-blur-sm"
          variants={itemVariants}
        >
          <motion.div className="space-y-4" variants={itemVariants}>
            <motion.div
              className="flex items-center justify-between"
              variants={itemVariants}
            >
              <div>
                <h3 className="font-medium text-white">Google Fit</h3>
                <p className="text-sm text-gray-400">
                  Connect your Google Fit account to sync your health and
                  fitness data
                </p>
              </div>
              <GoogleFitButton />
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
