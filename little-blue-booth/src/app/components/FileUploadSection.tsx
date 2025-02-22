"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface FileUploadSectionProps {
  files: FileList | null;
  setFiles: (files: FileList | null) => void;
  onUpload: () => void;
}

export const FileUploadSection = ({
  files,
  setFiles,
  onUpload,
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
              onChange={(e) => setFiles(e.target.files)}
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
                  </h4>
                  <ul className="text-left">
                    {Array.from(files).map((file, index) => (
                      <li
                        key={index}
                        className="mb-1 flex items-center gap-2 text-sm text-blue-200/80"
                      >
                        <svg
                          className="h-4 w-4"
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
                        {file.name}
                      </li>
                    ))}
                  </ul>
                </div>

                <motion.button
                  onClick={onUpload}
                  className="group relative mt-4 inline-flex w-full items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 p-0.5 text-sm font-semibold text-white hover:text-white focus:outline-none focus:ring-4 focus:ring-blue-800"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="relative w-full rounded-md bg-[#020817] px-6 py-2.5 transition-all duration-300 ease-in-out group-hover:bg-opacity-0">
                    Upload & Analyze Files
                  </span>
                </motion.button>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
