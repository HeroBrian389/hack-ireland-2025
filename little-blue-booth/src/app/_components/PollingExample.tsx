'use client';

import { api } from "~/trpc/react";

export function PollingExample() {
  const { data, isLoading, error } = api.polling.polling.useQuery(
    undefined, // no input needed
    {
      refetchInterval: 2000, // refetch every 2 seconds
      refetchIntervalInBackground: true, // continue polling when tab is in background
    }
  );

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Polling Example</h2>
      
      <div className="mb-4 p-4 border rounded">
        {isLoading && <p>Loading...</p>}
        {error && <p className="text-red-500">Error: {error.message}</p>}
        {data?.map((job) => (
          <div key={job.id} className="mt-2 p-2 bg-gray-100 rounded">
            <div className="font-semibold">Job ID: {job.id}</div>
            <div className="mt-1 text-sm">
              Data: {JSON.stringify(job.data, null, 2)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 