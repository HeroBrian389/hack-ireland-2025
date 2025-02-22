"use client";

export const WorkerStatus = ({ isPollingLoading }: { isPollingLoading: boolean }) => (
  <div className="flex items-center gap-2 h-8 rounded-lg border border-blue-500/20 bg-[#020817] p-4">
    <div className={`h-2 w-2 rounded-full ${isPollingLoading ? 'bg-blue-400 animate-pulse' : 'bg-gray-400'}`} />
    <h3 className="text-sm font-semibold text-blue-400">Worker Status</h3>
  </div>
);
