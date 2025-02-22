"use client";

import { WorkerJob } from "@/types"; // Or wherever you define WorkerJob
import { motion } from "framer-motion";

interface WorkerStatusProps {
  workerData?: WorkerJob[];
  isPollingLoading: boolean;
}

export const WorkerStatus = ({ workerData, isPollingLoading }: WorkerStatusProps) => {
  return (
    <div className="rounded-lg border border-blue-500/20 bg-[#020817] p-4">
      <h3 className="mb-2 text-sm font-semibold text-blue-400">Worker Status</h3>
      {isPollingLoading ? (
        <p className="text-sm text-gray-400">Loading worker status...</p>
      ) : (
        <div className="max-h-48 overflow-y-auto">
          {workerData?.map((job) => (
            <div
              key={job.id}
              className="mb-2 border-b border-blue-500/10 pb-2 last:border-0"
            >
              <p className="text-xs text-blue-300">Job ID: {job.id}</p>
              <p className="text-xs text-gray-400">
                Status: {job.data.processed ? "Completed" : "Processing"}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
