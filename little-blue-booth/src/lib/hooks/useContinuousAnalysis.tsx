// hooks/useContinuousAnalysis.ts
"use client";

import { useEffect, useRef } from "react";
import { Message, UserAssistantMessage } from "@/types";

interface UseContinuousAnalysisProps {
  messages: Message[];
  isConsultationStarted: boolean;
  isPaused: boolean;
  analyzeMutation: any; // type from your TRPC
  sendMessage: (args: any) => void; // or your specific type
  setLastAnalysisTimestamp: (ts: string) => void;
  setWorkerIds: React.Dispatch<React.SetStateAction<string[]>>;
}

export function useContinuousAnalysis({
  messages,
  isConsultationStarted,
  isPaused,
  analyzeMutation,
  sendMessage,
  setLastAnalysisTimestamp,
  setWorkerIds,
}: UseContinuousAnalysisProps) {
  const lastAnalyzedMessageRef = useRef<{ timestamp: string; content: string } | null>(
    null
  );

  useEffect(() => {
    const performContinuousAnalysis = async () => {
      if (messages.length === 0) return;

      const lastMessage = messages[messages.length - 1];
      if (
        !lastMessage ||
        lastMessage.role !== "user" ||
        lastMessage.content.includes("[Background Analysis]") ||
        (lastAnalyzedMessageRef.current?.timestamp === lastMessage.timestamp &&
          lastAnalyzedMessageRef.current?.content === lastMessage.content)
      ) {
        return;
      }

      // Mark that we've seen it
      lastAnalyzedMessageRef.current = {
        timestamp: lastMessage.timestamp,
        content: lastMessage.content,
      };

      // Filter out system messages
      const conversationForAnalysis = messages
        .filter((msg): msg is UserAssistantMessage =>
          msg.role === "user" || msg.role === "assistant"
        )
        .map(({ role, content }) => ({ role, content }));

      try {
        const result = await analyzeMutation.mutateAsync(conversationForAnalysis);
        if (result?.workerIds?.length) {
          setWorkerIds((prev) => [...prev, ...result.workerIds]);
        }
      } catch (err) {
        console.error("Analysis request failed:", err);
      }
    };

    if (isConsultationStarted && !isPaused) {
      const timeoutId = setTimeout(() => {
        void performContinuousAnalysis();
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [messages, isConsultationStarted, isPaused, analyzeMutation, setWorkerIds, sendMessage]);
}
