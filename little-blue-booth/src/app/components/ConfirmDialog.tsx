"use client";

import { motion, AnimatePresence } from "framer-motion";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

export const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
}: ConfirmDialogProps) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50"
          onClick={onClose}
        />
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
