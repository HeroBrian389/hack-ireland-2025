"use client";

import { useEffect, useState, useRef } from "react";
import { useWebRTC } from "~/lib/hooks/useWebRTC";
import { useConversation } from "~/lib/context/ConversationContext";

const blankAnalysis = `[Background Analysis] No new hypotheses can be generated from the conversation so far.`;

export const WebRTCClient = () => {
  const {
    isConnected,
    isLoading,
    error,
    isMuted,
    connect,
    disconnect,
    sendMessage,
    toggleMic,
    pauseSession,
    resumeSession,
  } = useWebRTC();

  const {
    state: { messages },
  } = useConversation();
  const [message, setMessage] = useState("");
  const [isReasoning, setIsReasoning] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastAnalyzedMessageRef = useRef<{
    timestamp: string;
    content: string;
  } | null>(null);

  // Call continuous analysis whenever messages change
  useEffect(() => {
    const performContinuousAnalysis = async () => {
      if (messages.length === 0) return;

      const lastMessage = messages[messages.length - 1];

      console.log("lastMessage", lastMessage);

      // Skip if:
      // 1. Not a user message
      // 2. We've already analyzed this exact message (checking both content and timestamp)
      // 3. Message is a system message or analysis result
      if (
        lastMessage?.role !== "user" ||
        lastMessage.content.includes("[Background Analysis]") ||
        (lastAnalyzedMessageRef.current?.timestamp === lastMessage.timestamp &&
          lastAnalyzedMessageRef.current?.content === lastMessage.content)
      ) {
        return;
      }

      try {
        const response = await fetch("/api/continued-analysis", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            conversation: messages,
          }),
        });

        const data = (await response.json()) as {
          success: boolean;
          analysis: string;
        };

        // Update the last analyzed message reference
        lastAnalyzedMessageRef.current = {
          timestamp: lastMessage.timestamp,
          content: lastMessage.content,
        };

        if (data.success && data.analysis !== blankAnalysis) {
          // Prepare and send the analysis message
          const analysisMessage = {
            role: "system",
            content: `[Background Analysis] ${data.analysis}`,
            timestamp: new Date().toISOString(),
          };

          sendMessage({
            type: "response.create",
            response: {
              modalities: ["text"],
              instructions: analysisMessage.content,
            },
          });
        }
      } catch (error) {
        console.error("Continuous analysis request failed:", error);
      }
    };

    if (messages.length > 0) {
      void performContinuousAnalysis();
    }
  }, [messages, sendMessage]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = () => {
    if (message.trim()) {
      const responseCreate = {
        type: "response.create",
        response: {
          modalities: ["text"],
          instructions: message,
        },
      };
      sendMessage(responseCreate);
      setMessage("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleReasoningRequest = async () => {
    setIsReasoning(true);
    await pauseSession();

    try {
      const response = await fetch("/api/reason", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversation: messages,
        }),
      });

      const data = (await response.json()) as {
        success: boolean;
        analysis: string;
      };

      if (data.success) {
        // Send the analysis back to the conversation
        sendMessage({
          type: "response.create",
          response: {
            modalities: ["text"],
            instructions: data.analysis,
          },
        });
      }
    } catch (error) {
      console.error("Reasoning request failed:", error);
    } finally {
      await resumeSession();
      setIsReasoning(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl p-4">
      <div className="mb-4">
        <h2 className="mb-2 text-2xl font-bold">AI Medical Consultation</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={connect}
            disabled={isConnected || isLoading}
            className="rounded bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600 disabled:bg-gray-400"
          >
            {isLoading ? "Starting consultation..." : "Start Consultation"}
          </button>
          <button
            onClick={disconnect}
            disabled={!isConnected}
            className="rounded bg-red-500 px-4 py-2 text-white transition-colors hover:bg-red-600 disabled:bg-gray-400"
          >
            End Consultation
          </button>
          {isConnected && (
            <>
              <button
                onClick={toggleMic}
                className={`rounded px-4 py-2 transition-colors ${
                  isMuted
                    ? "bg-yellow-500 hover:bg-yellow-600"
                    : "bg-green-500 hover:bg-green-600"
                } text-white`}
              >
                {isMuted ? "Unmute Mic" : "Mute Mic"}
              </button>
              <button
                onClick={handleReasoningRequest}
                disabled={isReasoning}
                className="rounded bg-purple-500 px-4 py-2 text-white transition-colors hover:bg-purple-600 disabled:bg-gray-400"
              >
                {isReasoning ? "Analyzing..." : "Request Analysis"}
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded bg-red-100 p-2 text-red-700">{error}</div>
      )}

      <div className="mb-4">
        <p className="text-sm text-gray-600">
          Status: {isConnected ? "Consultation in progress" : "Not connected"}
        </p>
      </div>

      {/* Messages Display */}
      <div className="mb-4 h-[500px] overflow-y-auto rounded-lg border bg-gray-50 p-4 shadow-inner">
        {messages.length === 0 && !isConnected && (
          <div className="mt-4 text-center text-gray-500">
            <p>Welcome to your AI medical consultation.</p>
            <p>Click &quot;Start Consultation&quot; to begin.</p>
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.timestamp}
            className={`mb-3 rounded-lg p-3 ${
              msg.role === "user"
                ? "ml-auto max-w-[80%] bg-blue-100"
                : msg.role === "assistant"
                  ? "max-w-[80%] bg-white shadow-sm"
                  : "bg-gray-200 text-center text-sm"
            }`}
          >
            <p className="mb-1 text-xs font-medium text-gray-500">
              {msg.role === "system"
                ? "System"
                : msg.role === "user"
                  ? "You"
                  : "Doctor"}
            </p>
            <p className="whitespace-pre-wrap text-gray-800">{msg.content}</p>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="flex gap-2">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={
            isConnected
              ? "Type your message here..."
              : "Start consultation to begin..."
          }
          className="h-[60px] flex-1 resize-none rounded-lg border px-4 py-3 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={!isConnected}
        />
        <button
          onClick={handleSendMessage}
          disabled={!isConnected || !message.trim()}
          className="rounded-lg bg-green-500 px-6 py-2 text-white transition-colors hover:bg-green-600 disabled:bg-gray-400"
        >
          Send
        </button>
      </div>
    </div>
  );
};
