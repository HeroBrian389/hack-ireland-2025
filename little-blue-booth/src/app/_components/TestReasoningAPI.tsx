'use client';

import { api } from "~/trpc/react";

export function TestReasoningAPI() {
  const analyzeMutation = api.reasoning_bots.analyzeConversation.useMutation();

  const testCases = [
    {
      name: "Simple greeting",
      conversation: [
        { role: "user" as const, content: "Hello!" },
        { role: "assistant" as const, content: "Hi there!" },
      ]
    },
    // Add more test cases as needed
  ];

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">API Test Cases</h2>
      {testCases.map((test, index) => (
        <div key={index} className="mb-4 p-4 border rounded">
          <h3 className="font-semibold">{test.name}</h3>
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded mt-2"
            onClick={async () => {
              try {
                const result = await analyzeMutation.mutateAsync(test.conversation);
                console.log(`Test ${index + 1} result:`, result);
              } catch (error) {
                console.error(`Test ${index + 1} error:`, error);
              }
            }}
          >
            Run Test
          </button>
          
          {analyzeMutation.isPending && <p className="mt-2">Running...</p>}          {analyzeMutation.data && (
            <pre className="mt-2 p-2 bg-gray-100 rounded">
              {JSON.stringify(analyzeMutation.data, null, 2)}
            </pre>
          )}
        </div>
      ))}
    </div>
  );
} 