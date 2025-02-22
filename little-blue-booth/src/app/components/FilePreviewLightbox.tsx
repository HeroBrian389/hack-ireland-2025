import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import Image from "next/image";

interface FilePreviewLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string | null;
  fileName: string;
  analysis: string;
}

export function FilePreviewLightbox({
  isOpen,
  onClose,
  fileUrl,
  fileName,
  analysis,
}: FilePreviewLightboxProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative mx-4 max-h-[90vh] max-w-4xl overflow-hidden rounded-lg bg-white/10 p-6 backdrop-blur-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full bg-white/20 p-2 text-white transition-colors hover:bg-white/30"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="mb-4">
            <h3 className="text-xl font-semibold text-white">{fileName}</h3>
          </div>

          {fileUrl && (
            <div className="relative mb-4 h-[60vh] w-full overflow-hidden rounded-lg">
              <Image
                src={fileUrl}
                alt={fileName}
                fill
                className="object-contain"
                priority
              />
            </div>
          )}

          <div className="mt-4 max-h-32 overflow-y-auto rounded-lg bg-white/5 p-4">
            <p className="text-sm text-blue-200">{analysis}</p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
} 