import { motion, AnimatePresence } from "framer-motion";
import { FileText } from "lucide-react";
import { useState } from "react";
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
  const [hoveredFile, setHoveredFile] = useState<AnalyzedFile | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<AnalyzedFile | null>(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  if (!files.length) return null;

  const handleMouseEnter = async (file: AnalyzedFile) => {
    setHoveredFile(file);
    if (file.storageLocation && !previewUrl) {
      try {
        const response = await fetch(
          `/api/presigned-url?location=${encodeURIComponent(file.storageLocation)}`
        );
        const data = (await response.json()) as PresignedUrlResponse;
        if (data.success && data.url) {
          setPreviewUrl(data.url);
        }
      } catch (error) {
        console.error("Failed to get presigned URL:", error);
      }
    }
  };

  const handleMouseLeave = () => {
    setHoveredFile(null);
    setPreviewUrl(null);
  };

  const handleFileClick = async (file: AnalyzedFile) => {
    if (file.storageLocation) {
      try {
        const response = await fetch(
          `/api/presigned-url?location=${encodeURIComponent(file.storageLocation)}`
        );
        const data = (await response.json()) as PresignedUrlResponse;
        if (data.success && data.url) {
          setPreviewUrl(data.url);
          setSelectedFile(file);
          setIsLightboxOpen(true);
        }
      } catch (error) {
        console.error("Failed to get presigned URL:", error);
      }
    }
    onFileClick?.(file);
  };

  console.log(files);


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
            {files.map((file) => (
              <motion.div
                key={file.storageLocation ? 
                  `${file.filename}-${file.storageLocation}` : 
                  `${file.filename}-${file.timestamp}-${Math.random()}`}
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
                  {hoveredFile === file && file.presignedUrl && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, x: 20 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95, x: 20 }}
                      className="absolute left-full top-0 z-50 ml-4 w-64 overflow-hidden rounded-lg bg-white/10 p-2 backdrop-blur-lg"
                    >
                      <div className="relative h-40 w-full overflow-hidden rounded-lg">
                        <Image
                          src={file.presignedUrl ?? ""}
                          alt="File"
                          fill
                          className="object-cover"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      </motion.div>

      {/* Lightbox */}
      <FilePreviewLightbox
        isOpen={isLightboxOpen}
        onClose={() => {
          setIsLightboxOpen(false);
          setSelectedFile(null);
          setPreviewUrl(null);
        }}
        fileUrl={previewUrl}
        fileName={selectedFile?.filename ?? ""}
        analysis={selectedFile?.analysis ?? ""}
      />
    </>
  );
} 