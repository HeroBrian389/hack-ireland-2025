'use client';

import { api } from "~/trpc/react";

export function TestQueue() {
  const addJobMutation = api.reasoning_bots.analyzeConversation.useMutation();

  return (
    <div className="p-4 border rounded-lg">
      <h2 className="text-xl font-bold mb-4">Queue Test</h2>
      
      <button
        className="bg-blue-500 text-white px-4 py-2 rounded"
        onClick={() => addJobMutation.mutate([
          { role: "user", content: "Test message" }
        ])}
      >
        Add Job to Queue
      </button>

      {addJobMutation.isPending && <p className="mt-2">Adding job...</p>}
      {addJobMutation.isError && (
        <p className="mt-2 text-red-500">Error: {addJobMutation.error.message}</p>
      )}
    </div>
  );
} 