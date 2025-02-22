"use client";


import { useEffect, useState, useRef } from 'react';
import { useWebRTC } from '@/lib/hooks/useWebRTC';
import { useConversation } from '@/lib/context/ConversationContext';

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
    resumeSession
  } = useWebRTC();

  const { state: { messages } } = useConversation();
  const [message, setMessage] = useState('');
  const [isReasoning, setIsReasoning] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastAnalyzedMessageRef = useRef<{ timestamp: string; content: string } | null>(null);

  // Call continuous analysis whenever messages change
  useEffect(() => {
    const performContinuousAnalysis = async () => {
      if (messages.length === 0) return;

      const lastMessage = messages[messages.length - 1];

      // Skip if:
      // 1. Not a user message
      // 2. We've already analyzed this exact message (checking both content and timestamp)
      // 3. Message is a system message or analysis result
      if (lastMessage?.role !== 'user' ||
        lastMessage.content.includes('[Background Analysis]') ||
        (lastAnalyzedMessageRef.current?.timestamp === lastMessage.timestamp &&
          lastAnalyzedMessageRef.current?.content === lastMessage.content)) {
        return;
      }

      try {
        const response = await fetch('/api/continued-analysis', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            conversation: messages,
          }),
        });

        const data = await response.json();


        // Update the last analyzed message reference
        lastAnalyzedMessageRef.current = {
          timestamp: lastMessage.timestamp,
          content: lastMessage.content
        };

        if (data.success && data.analysis !== blankAnalysis) {
          // Prepare and send the analysis message
          const analysisMessage = {
            role: 'system',
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
        console.error('Continuous analysis request failed:', error);
      }
    };

    if (messages.length > 0) {
      performContinuousAnalysis();
    }
  }, [messages, sendMessage]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
      setMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleReasoningRequest = async () => {
    setIsReasoning(true);
    await pauseSession();

    try {
      const response = await fetch('/api/reason', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversation: messages
        }),
      });

      const data = await response.json();

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
      console.error('Reasoning request failed:', error);
    } finally {
      await resumeSession();
      setIsReasoning(false);
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="mb-4">
        <h2 className="text-2xl font-bold mb-2">AI Medical Consultation</h2>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={connect}
            disabled={isConnected || isLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-400 hover:bg-blue-600 transition-colors"
          >
            {isLoading ? 'Starting consultation...' : 'Start Consultation'}
          </button>
          <button
            onClick={disconnect}
            disabled={!isConnected}
            className="px-4 py-2 bg-red-500 text-white rounded disabled:bg-gray-400 hover:bg-red-600 transition-colors"
          >
            End Consultation
          </button>
          {isConnected && (
            <>
              <button
                onClick={toggleMic}
                className={`px-4 py-2 rounded transition-colors ${isMuted
                  ? 'bg-yellow-500 hover:bg-yellow-600'
                  : 'bg-green-500 hover:bg-green-600'
                  } text-white`}
              >
                {isMuted ? 'Unmute Mic' : 'Mute Mic'}
              </button>
              <button
                onClick={handleReasoningRequest}
                disabled={isReasoning}
                className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors disabled:bg-gray-400"
              >
                {isReasoning ? 'Analyzing...' : 'Request Analysis'}
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="mb-4">
        <p className="text-sm text-gray-600">
          Status: {isConnected ? 'Consultation in progress' : 'Not connected'}
        </p>
      </div>

      {/* Messages Display */}
      <div className="mb-4 h-[500px] overflow-y-auto border rounded-lg p-4 bg-gray-50 shadow-inner">
        {messages.length === 0 && !isConnected && (
          <div className="text-center text-gray-500 mt-4">
            <p>Welcome to your AI medical consultation.</p>
            <p>Click &quot;Start Consultation&quot; to begin.</p>
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.timestamp}
            className={`mb-3 p-3 rounded-lg ${msg.role === 'user'
              ? 'bg-blue-100 ml-auto max-w-[80%]'
              : msg.role === 'assistant'
                ? 'bg-white max-w-[80%] shadow-sm'
                : 'bg-gray-200 text-center text-sm'
              }`}
          >
            <p className="text-xs text-gray-500 mb-1 font-medium">
              {msg.role === 'system' ? 'System' : msg.role === 'user' ? 'You' : 'Doctor'}
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
          placeholder={isConnected ? "Type your message here..." : "Start consultation to begin..."}
          className="flex-1 px-4 py-3 border rounded-lg resize-none h-[60px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={!isConnected}
        />
        <button
          onClick={handleSendMessage}
          disabled={!isConnected || !message.trim()}
          className="px-6 py-2 bg-green-500 text-white rounded-lg disabled:bg-gray-400 hover:bg-green-600 transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
}; 