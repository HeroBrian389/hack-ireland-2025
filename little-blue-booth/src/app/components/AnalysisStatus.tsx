"use client";

import React from "react";

interface AnalysisStatusProps {
  isAnalyzing: boolean;
  analysisError: string | null;
  lastAnalysisTimestamp: string | null;
}

export const AnalysisStatus = ({
  isAnalyzing,
  analysisError,
  lastAnalysisTimestamp,
}: AnalysisStatusProps) => {
  return (
    <div className="rounded-lg border border-blue-500/20 bg-[#020817] p-4">
      <h3 className="mb-2 text-sm font-semibold text-blue-400">Analysis Status</h3>
      <div className="text-xs text-gray-400">
        {isAnalyzing ? (
          <p>Analyzing conversation...</p>
        ) : analysisError ? (
          <p className="text-red-400">Analysis error: {analysisError}</p>
        ) : (
          <p>
            Last analysis:{" "}
            {lastAnalysisTimestamp
              ? new Date(lastAnalysisTimestamp).toLocaleTimeString()
              : "No analysis yet"}
          </p>
        )}
      </div>
    </div>
  );
};
