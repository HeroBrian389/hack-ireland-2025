"use client";

export const WorkerStatus = ({ isPollingLoading }: { isPollingLoading: boolean }) => {
  return (
    <div className="rounded-lg border border-blue-500/20 bg-[#020817] p-4">
      <h3 className="mb-2 text-sm font-semibold text-blue-400">Worker Status</h3>
      {isPollingLoading ? (
        <p className="text-sm text-gray-400">Loading worker status...</p>
      ) : (
        <p className="text-sm text-gray-400">No active workers</p>
      )}
    </div>
  );
};
