"use client";

import { useState } from "react";
import { useTaskSocket } from "~/hooks/useTaskSocket";

export default function TVPage() {
  // In a real app you might get this from URL params, from user input, etc.
  // For now, pick a conversationId or sessionId to subscribe to.
  const conversationId = "YOUR-CONVERSATION-ID-HERE";

  // We'll store all incoming socket messages in state.
  const [events, setEvents] = useState<string[]>([]);

  // Reuse your existing useTaskSocket hook
  useTaskSocket({
    conversationId,
    onConversationProcessed: (data) => {
      setEvents((prev) => [
        ...prev,
        `Conversation processed: ${JSON.stringify(data)}`,
      ]);
    },
    onAnalysisCompleted: (data) => {
      setEvents((prev) => [
        ...prev,
        `Analysis completed: ${JSON.stringify(data)}`,
      ]);
    },
    onReasoningCompleted: (data) => {
      setEvents((prev) => [
        ...prev,
        `Reasoning completed: ${JSON.stringify(data)}`,
      ]);
    },
  });

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <h1 className="text-2xl font-bold mb-6">TV Mode</h1>

      <p className="mb-4 text-gray-300">
        Subscribed to conversation: <strong>{conversationId}</strong>
      </p>

      <div className="w-full max-w-3xl bg-gray-800 text-white rounded-lg p-4 shadow">
        <h2 className="text-lg font-semibold mb-2">Events</h2>
        <ul className="space-y-1">
          {events.map((evt, idx) => (
            <li key={idx} className="text-sm border-b border-gray-700 pb-1">
              {evt}
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
