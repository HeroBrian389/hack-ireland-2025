"use client";

import { useState, useEffect, useRef } from "react";
import { useConversation, Message } from "../context/ConversationContext";

interface WebRTCState {
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  isMuted: boolean;
}

interface WebRTCMessage {
  type: string;
  response?: {
    modalities?: string[];
    instructions?: string;
  };
  session?: {
    tools: {
      type: string;
      name: string;
      description: string;
      parameters: {
        type: string;
        properties: Record<string, unknown>;
        required: string[];
      };
    }[];
    tool_choice: string;
  };
  item?: {
    type: string;
    call_id?: string;
    output?: string;
    role?: string;
    content?: {
      type: string;
      text: string;
    };
  };
}

interface SessionResponse {
  client_secret: {
    value: string;
  };
}

export interface WebRTCEvent {
  type: string;
  transcript?: string;
  item?: {
    role?: string;
    content?: {
      text: string;
    };
  };
  response?: {
    output?: Array<{
      type: string;
      text?: string;
      name?: string;
      arguments?: string;
      call_id?: string;
      id?: string;
    }>;
  };
  error?: string;
}

interface ReasonResponse {
  success: boolean;
  analysis?: string;
  error?: string;
}

interface WebRTCHook extends WebRTCState {
  messages: Message[];
  connect: () => Promise<void>;
  disconnect: () => void;
  sendMessage: (message: WebRTCMessage) => void;
  sendUserMessage: (text: string) => void;
  toggleMic: () => Promise<void>;
  pauseSession: () => Promise<void>;
  resumeSession: () => Promise<void>;
  isMuted: boolean;
}

export const useWebRTC = (): WebRTCHook => {
  const { state, addMessage, clearMessages } = useConversation();
  const [webRTCState, setWebRTCState] = useState<WebRTCState>({
    isConnected: false,
    isLoading: false,
    error: null,
    isMuted: false,
  });

  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const dataChannel = useRef<RTCDataChannel | null>(null);
  const audioElement = useRef<HTMLAudioElement | null>(null);
  const audioStream = useRef<MediaStream | null>(null);
  const conversationRef = useRef<Message[]>(state.messages);

  // Track pending medical reasoning calls using both state and ref
  const [pendingMedicalReasoningCalls, setPendingMedicalReasoningCalls] =
    useState<string[]>([]);
  const pendingCallsRef = useRef<string[]>([]);

  // Keep conversationRef up to date with latest messages
  useEffect(() => {
    conversationRef.current = state.messages;
  }, [state.messages]);

  // Keep pendingCallsRef in sync with state
  useEffect(() => {
    pendingCallsRef.current = pendingMedicalReasoningCalls;
  }, [pendingMedicalReasoningCalls]);

  const toggleMic = async () => {
    if (audioStream.current) {
      const audioTracks = audioStream.current.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
      setWebRTCState((prev) => ({ ...prev, isMuted: !prev.isMuted }));
    }
  };

  const initializeConnection = async () => {
    try {
      setWebRTCState((prev) => ({ ...prev, isLoading: true, error: null }));

      // Get session ID from your server
      const tokenResponse = await fetch("/api/session");
      const data = (await tokenResponse.json()) as SessionResponse;

      const EPHEMERAL_KEY = data.client_secret.value;

      if (!EPHEMERAL_KEY) {
        throw new Error("Failed to get valid ephemeral key");
      }

      // Create peer connection
      const pc = new RTCPeerConnection();
      peerConnection.current = pc;

      // Set up data channel
      const dc = pc.createDataChannel("oai-events");
      dataChannel.current = dc;

      dc.onopen = () => {
        setWebRTCState((prev) => ({ ...prev, isConnected: true }));
        // Configure the available tools when connection is established
        sendMessage({
          type: "session.update",
          session: {
            tools: [
              {
                type: "function",
                name: "medical_reasoning",
                description:
                  "Analyze the conversation for medical insights and provide medical reasoning.",
                parameters: {
                  type: "object",
                  properties: {},
                  required: [],
                },
              },
            ],
            tool_choice: "auto",
          },
        });
      };

      dc.onmessage = (e: MessageEvent<string>) => {
        const event = JSON.parse(e.data) as WebRTCEvent;
        console.debug("[WebRTC] Received raw event:", event);
        console.debug("[WebRTC] Current conversation state:", conversationRef.current);

        switch (event.type) {
          case "conversation.item.input_audio_transcription.completed":
            console.debug("[WebRTC] Processing transcription:", event.transcript);
            if (event.transcript) {
              // Create the message object
              const newMessage = {
                role: "user" as const,
                content: event.transcript,
                timestamp: new Date().toISOString(),
              };

              // Check if this message is already in the conversation
              const isDuplicate = conversationRef.current.some(
                (msg) =>
                  msg.role === newMessage.role &&
                  msg.content === newMessage.content &&
                  Math.abs(
                    new Date(msg.timestamp).getTime() -
                      new Date(newMessage.timestamp).getTime(),
                  ) < 1000,
              );

              console.log("isDuplicate", isDuplicate);

              if (!isDuplicate) {
                console.debug("[WebRTC] Adding transcribed message:", newMessage);
                addMessage("user", event.transcript);
              } else {
                console.debug("[WebRTC] Skipped duplicate transcribed message:", newMessage);
              }

              // Process any pending medical reasoning calls
              const pendingCalls = pendingCallsRef.current;
              if (pendingCalls.length > 0) {
                console.debug("[WebRTC] Processing pending medical reasoning calls:", pendingCalls);
                pendingCalls.forEach((callId) => {
                  console.debug("[WebRTC] Initiating medical reasoning for call:", callId);
                  void doMedicalReasoning(callId, isDuplicate ? undefined : newMessage);
                });
                setPendingMedicalReasoningCalls([]);
                pendingCallsRef.current = [];
              }
            }
            break;

          case "conversation.item.created":
            console.debug("[WebRTC] Processing conversation.item.created:", event.item);
            const text = event.item?.content?.text;
            const role = event.item?.role;
            
            if (text && role) {
              const messageRole =
                role === "assistant"
                  ? "assistant"
                  : role === "user"
                    ? "user"
                    : "system";

              // Enhanced duplicate detection
              const isDuplicate = conversationRef.current.some((msg) => {
                const isSameContent = msg.role === messageRole && msg.content.trim() === text.trim();
                const timeDiff = Math.abs(new Date(msg.timestamp).getTime() - Date.now());
                console.debug("[WebRTC] Duplicate check:", {
                  message: msg,
                  isSameContent,
                  timeDiff,
                  threshold: 3000
                });
                return isSameContent && timeDiff < 3000;
              });

              console.log("isDuplicate2", isDuplicate);

              if (!isDuplicate) {
                console.debug("[WebRTC] Adding new message:", { role: messageRole, text });
                addMessage(messageRole, text);
                console.debug("[WebRTC] Updated conversation state:", conversationRef.current);
              } else {
                console.debug("[WebRTC] Skipped duplicate message:", { role: messageRole, text });
              }
            }
            break;

          case "response.done":
            console.debug("[WebRTC] Processing response.done:", event.response);
            if (event.response?.output) {
              event.response.output.forEach((outputItem) => {
                console.debug("[WebRTC] Processing output item:", outputItem);
                if (
                  outputItem.type === "function_call" &&
                  outputItem.name === "medical_reasoning"
                ) {
                  const callId = outputItem.call_id ?? outputItem.id;
                  console.debug("[WebRTC] Medical reasoning function call detected:", {
                    outputItem,
                    callId,
                  });
                  if (callId) {
                    setPendingMedicalReasoningCalls((prev) => [...prev, callId]);
                    pendingCallsRef.current = [...pendingCallsRef.current, callId];
                    if (audioStream.current) {
                      const audioTracks = audioStream.current.getAudioTracks();
                      audioTracks.forEach((track) => {
                        track.enabled = false;
                      });
                      setWebRTCState((prev) => ({ ...prev, isMuted: true }));
                    }
                  }
                } else if (outputItem.type === "text" && outputItem.text) {
                  console.debug("[WebRTC] Adding assistant message:", outputItem.text);
                  addMessage("assistant", outputItem.text);
                }
              });
            }
            break;

          case "error":
            console.error("[WebRTC] Received error event:", event.error);
            addMessage("system", `Error: ${event.error ?? "Unknown error"}`);
            break;
        }
      };

      // Set up audio handling
      if (!audioElement.current) {
        audioElement.current = new Audio();
        audioElement.current.autoplay = true;
      }

      pc.ontrack = (e) => {
        if (audioElement.current && e.streams[0]) {
          audioElement.current.srcObject = e.streams[0];
        }
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      audioStream.current = mediaStream;
      mediaStream.getTracks().forEach((track) => {
        pc.addTrack(track, mediaStream);
      });

      // Create and set local description
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Send offer to server and get answer
      const baseUrl = "https://api.openai.com/v1/realtime";
      const model = "gpt-4o-realtime-preview-2024-12-17";
      const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${EPHEMERAL_KEY}`,
          "Content-Type": "application/sdp",
        },
      });

      const answer: RTCSessionDescriptionInit = {
        type: "answer",
        sdp: await sdpResponse.text(),
      };
      await pc.setRemoteDescription(answer);

      setWebRTCState((prev) => ({ ...prev, isLoading: false }));
    } catch (error) {
      console.error("WebRTC initialization error:", error);
      setWebRTCState((prev) => ({
        ...prev,
        isLoading: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to initialize WebRTC",
      }));
    }
  };

  const pauseSession = async () => {
    if (audioStream.current) {
      const audioTracks = audioStream.current.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = false;
      });
      setWebRTCState((prev) => ({ ...prev, isMuted: true }));
    }

    // Optionally send a message to indicate reasoning in progress
    if (dataChannel.current?.readyState === "open") {
      const pauseMessage = {
        type: "response.create",
        response: {
          modalities: ["text"],
          instructions:
            "Please wait while I analyze the information provided...",
        },
      };
      dataChannel.current.send(JSON.stringify(pauseMessage));
    }
  };

  const resumeSession = async () => {
    if (audioStream.current) {
      const audioTracks = audioStream.current.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = true;
      });
      setWebRTCState((prev) => ({ ...prev, isMuted: false }));
    }
  };

  const sendMessage = (message: WebRTCMessage) => {
    console.debug('[WebRTC] Attempting to send message:', message);
    if (dataChannel.current?.readyState === "open") {
      console.debug('[WebRTC] DataChannel is open, sending message');
      dataChannel.current.send(JSON.stringify(message));
      console.debug('[WebRTC] Message sent successfully');
    } else {
      console.error('[WebRTC] Cannot send message - data channel not open');
    }
  };

  const sendUserMessage = (text: string) => {
    console.debug("[WebRTC] sendUserMessage called with text:", text);
    console.debug("[WebRTC] DataChannel state:", dataChannel.current?.readyState);

    if (dataChannel.current?.readyState === "open") {
      console.debug("[WebRTC] Current conversation state before send:", conversationRef.current);

      const messagePayload = {
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: {
            type: "text",
            text: text,
          },
        },
      };
      console.debug("[WebRTC] Sending message payload:", messagePayload);
      sendMessage(messagePayload);

      // Request a response from the model
      console.debug("[WebRTC] Requesting response from model");
      sendMessage({
        type: "response.create",
      });

      console.debug("[WebRTC] Current conversation state after send:", conversationRef.current);
    } else {
      console.error("[WebRTC] Cannot send message - data channel not open");
    }
  };

  const disconnect = () => {
    if (peerConnection.current) {
      peerConnection.current.close();
    }
    if (audioElement.current) {
      audioElement.current.srcObject = null;
    }
    setWebRTCState({
      isConnected: false,
      isLoading: false,
      error: null,
      isMuted: false,
    });
    clearMessages();
  };

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  // NEW: Helper function for medical reasoning
  async function doMedicalReasoning(callId: string, latestMessage?: Message) {
    try {
      console.debug(
        "[WebRTC] Current messages state before API call:",
        conversationRef.current,
      );

      // Combine existing conversation with the latest message
      const conversation = [
        ...conversationRef.current,
        ...(latestMessage ? [latestMessage] : []),
      ].map((msg) => ({
        ...msg,
        timestamp: new Date(msg.timestamp).toISOString(),
      }));

      console.debug(
        "[WebRTC] Formatted conversation for reason API:",
        conversation,
      );

      if (conversation.length === 0) {
        throw new Error("No conversation available for analysis");
      }

      const response = await fetch("/api/reason", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation }),
      });

      const data = (await response.json()) as ReasonResponse;
      console.debug("[WebRTC] Reason API response:", data);

      // Unmute the mic after getting the response
      if (audioStream.current) {
        const audioTracks = audioStream.current.getAudioTracks();
        audioTracks.forEach((track) => {
          track.enabled = true;
        });
        setWebRTCState((prev) => ({ ...prev, isMuted: false }));
      }

      if (data.success && data.analysis) {
        console.debug("[WebRTC] Sending function call output back to model");
        sendMessage({
          type: "conversation.item.create",
          item: {
            type: "function_call_output",
            call_id: callId,
            output: JSON.stringify({ analysis: data.analysis }),
          },
        });

        console.debug("[WebRTC] Requesting new response from model");
        sendMessage({
          type: "response.create",
        });
      } else {
        console.error("[WebRTC] Medical reasoning API call failed:", data);
        addMessage("system", "Medical reasoning tool call failed.");
      }
    } catch (err) {
      console.error("[WebRTC] Medical reasoning error:", err);
      addMessage("system", "Error during medical reasoning.");

      // Also unmute the mic in case of error
      if (audioStream.current) {
        const audioTracks = audioStream.current.getAudioTracks();
        audioTracks.forEach((track) => {
          track.enabled = true;
        });
        setWebRTCState((prev) => ({ ...prev, isMuted: false }));
      }
    }
  }

  return {
    ...webRTCState,
    messages: state.messages,
    connect: initializeConnection,
    disconnect,
    sendMessage,
    sendUserMessage,
    toggleMic,
    pauseSession,
    resumeSession,
    isMuted: webRTCState.isMuted,
  };
};
