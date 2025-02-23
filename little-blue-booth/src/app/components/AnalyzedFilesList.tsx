"use client";

import { motion, AnimatePresence } from "framer-motion";
import { FileText } from "lucide-react";
import { useState, useCallback, useRef } from "react";
import Image from "next/image";
import { FilePreviewLightbox } from "./FilePreviewLightbox";

interface PresignedUrlResponse {
  success: boolean;
  url?: string;
  presignedUrl?: string;
  error?: string;
}

interface AnalyzedFile {
  filename: string;
  analysis: string;
  timestamp: string;
  storageLocation?: string;
  presignedUrl?: string;
}

interface AnalyzedFilesListProps {
  files: AnalyzedFile[];
  onFileClick?: (file: AnalyzedFile) => void;
}

export function AnalyzedFilesList({ files, onFileClick }: AnalyzedFilesListProps) {
  const [hoveredFileId, setHoveredFileId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<AnalyzedFile | null>(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const previewTimeoutRef = useRef<NodeJS.Timeout>();

  const getFileKey = (file: AnalyzedFile) => 
    file.storageLocation ?? `${file.filename}-${file.timestamp}`;

  if (!files.length) return null;

  const handleMouseEnter = (file: AnalyzedFile) => {
    const fileKey = getFileKey(file);
    // Clear any existing timeout
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
    }
    // Small delay to prevent flickering on quick mouse movements
    previewTimeoutRef.current = setTimeout(() => {
      setHoveredFileId(fileKey);
    }, 50);
  };

  const handleMouseLeave = () => {
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
    }
    setHoveredFileId(null);
  };

  const handleFileClick = (file: AnalyzedFile) => {
    setSelectedFile(file);
    setIsLightboxOpen(true);
    onFileClick?.(file);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="absolute left-4 top-24 z-40 w-64 rounded-lg bg-white/10 p-4 backdrop-blur-lg"
      >
        <h3 className="mb-4 text-lg font-semibold text-white">Analyzed Files</h3>
        <AnimatePresence mode="popLayout">
          <div className="space-y-2">
            {files.map((file) => {
              const fileKey = getFileKey(file);
              
              return (
                <motion.div
                  key={fileKey}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="group relative cursor-pointer rounded-md bg-white/5 p-3 transition-colors hover:bg-white/10"
                  onMouseEnter={() => handleMouseEnter(file)}
                  onMouseLeave={handleMouseLeave}
                  onClick={() => handleFileClick(file)}
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-400" />
                    <span className="text-sm font-medium text-white">{file.filename}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-blue-200">
                    {file.analysis}
                  </p>

                  {/* Preview Popover */}
                  <AnimatePresence>
                    {hoveredFileId === fileKey && file.presignedUrl && (
                      <motion.div
                        key={`preview-${fileKey}`}
                        initial={{ opacity: 0, scale: 0.95, x: 20 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95, x: 20 }}
                        className="absolute left-full top-0 z-50 ml-4 w-64 overflow-hidden rounded-lg bg-white/10 p-2 backdrop-blur-lg"
                      >
                        <div className="relative h-40 w-full overflow-hidden rounded-lg">
                          <Image
                            src={file.presignedUrl}
                            alt="Scan"
                            fill
                            className="object-cover"
                            priority
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </AnimatePresence>
      </motion.div>

      {/* Lightbox */}
      <FilePreviewLightbox
        isOpen={isLightboxOpen}
        onClose={() => {
          setIsLightboxOpen(false);
          setSelectedFile(null);
        }}
        fileUrl={selectedFile?.presignedUrl ?? null}
        fileName={selectedFile?.filename ?? ""}
        analysis={selectedFile?.analysis ?? ""}
      />
    </>
  );
} 