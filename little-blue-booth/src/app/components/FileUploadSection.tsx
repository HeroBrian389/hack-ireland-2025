"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface FileUploadSectionProps {
  files: FileList | null;
  setFiles: (files: FileList | null) => void;
  onUpload: (files: FileList) => void;
  isProcessing?: boolean;
  processedFiles?: Set<string>;
}

const LoadingSpinner = () => (
  <svg
    className="h-4 w-4 animate-spin text-blue-400"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

export const FileUploadSection = ({
  files,
  setFiles,
  onUpload,
  isProcessing = false,
  processedFiles = new Set(),
}: FileUploadSectionProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      setFiles(e.dataTransfer.files);
      onUpload(e.dataTransfer.files);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mx-auto mb-8 w-full max-w-xl"
    >
      <div className="relative">
        <div
          className={`relative overflow-hidden rounded-xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-purple-600/10 backdrop-blur-sm transition-all duration-300 ${
            isDragging ? "border-blue-400 bg-blue-500/20" : ""
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="p-8 text-center">
            <motion.div
              className="mb-4 flex justify-center"
              animate={{ scale: isDragging ? 1.1 : 1 }}
              transition={{ duration: 0.2 }}
            >
              <svg
                className="h-12 w-12 text-blue-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </motion.div>

            <h3 className="mb-2 text-xl font-semibold text-blue-100">
              Upload Your Medical Files
            </h3>
            <p className="mb-4 text-blue-200/80">
              Drag and drop your scans or medical images here, or click to browse
            </p>

            <input
              type="file"
              multiple
              accept="image/*,.pdf,.dicom"
              onChange={(e) => {
                if (e.target.files) {
                  setFiles(e.target.files);
                  onUpload(e.target.files);
                }
              }}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />

            {files && files.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4"
              >
                <div className="rounded-lg bg-blue-500/10 p-4 backdrop-blur-sm">
                  <h4 className="mb-2 font-medium text-blue-100">
                    Selected Files ({files.length})
                    {isProcessing && (
                      <span className="ml-2 text-sm text-blue-200/80">
                        Processing...
                      </span>
                    )}
                  </h4>
                  <ul className="space-y-2">
                    {Array.from(files).map((file, index) => (
                      <motion.li
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        className="flex items-center justify-between rounded-lg bg-blue-500/5 px-4 py-3 text-sm text-blue-200/80 backdrop-blur-sm transition-colors hover:bg-blue-500/10"
                      >
                        <div className="flex items-center gap-3">
                          <svg
                            className="h-5 w-5 text-blue-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                          <span className="truncate">{file.name}</span>
                        </div>
                        <div className="flex items-center">
                          {isProcessing && !processedFiles.has(file.name) && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.5 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="flex items-center gap-2"
                            >
                              <span className="text-xs text-blue-300/70">Processing</span>
                              <LoadingSpinner />
                            </motion.div>
                          )}
                          {processedFiles.has(file.name) && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.5 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="flex items-center gap-2"
                            >
                              <span className="text-xs text-green-300/70">Complete</span>
                              <svg
                                className="h-5 w-5 text-green-400"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            </motion.div>
                          )}
                        </div>
                      </motion.li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
