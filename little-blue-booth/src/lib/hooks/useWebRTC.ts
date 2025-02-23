"use client";

import { useState, useEffect, useRef } from "react";
import { useConversation, Message } from "../context/ConversationContext";

interface WebRTCState {
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  isMuted: boolean;
  isConnecting: boolean;
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
    id?: string;
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
  connect: (userName?: string) => Promise<void>;
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
    isConnecting: false,
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

  const initializeConnection = async (userName?: string) => {
    try {
      console.debug(
        "[WebRTC] Initializing connection with userName:",
        userName,
      );

      // Construct URL with userName parameter if provided
      const url = new URL("/api/session", window.location.origin);
      if (userName?.trim()) {
        url.searchParams.append("userName", userName.trim());
      }
      console.debug("[WebRTC] Session URL:", url.toString());

      const tokenResponse = await fetch(url);
      if (!tokenResponse.ok) {
        throw new Error("Failed to get session token");
      }

      const { client_secret } = (await tokenResponse.json()) as SessionResponse;

      const EPHEMERAL_KEY = client_secret.value;

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

        switch (event.type) {
          // A) Audio transcription completed
          case "conversation.item.input_audio_transcription.completed": {
            console.debug(
              `[WebRTC] transcription.completed: transcript="${event.transcript}", itemId=${
                event.item?.id ?? "(none)"
              }`,
            );
            if (event.transcript) {
              const newMessage = {
                role: "user" as const,
                content: event.transcript.trim(),
                timestamp: new Date().toISOString(),
              };

              // ───── Unified Duplicate Check ─────
              const isDuplicate = conversationRef.current.some(
                (existingMsg) => {
                  const sameRole = existingMsg.role === newMessage.role;
                  const sameContent =
                    existingMsg.content.trim() === newMessage.content;
                  const timeDiff = Math.abs(
                    new Date(existingMsg.timestamp).getTime() -
                      new Date(newMessage.timestamp).getTime(),
                  );
                  return sameRole && sameContent && timeDiff < 2000;
                },
              );

              console.debug(
                "[WebRTC] transcription.completed -> isDuplicate?",
                isDuplicate,
              );

              if (!isDuplicate) {
                addMessage("user", event.transcript.trim());
              } else {
                console.debug(
                  "[WebRTC] Skipped adding duplicate transcription message",
                );
              }

              // Process any pending medical reasoning calls
              if (pendingCallsRef.current.length > 0) {
                console.debug(
                  "[WebRTC] We have pending calls:",
                  pendingCallsRef.current,
                );
                pendingCallsRef.current.forEach((callId) => {
                  void doMedicalReasoning(
                    callId,
                    isDuplicate ? undefined : newMessage,
                  );
                });
                setPendingMedicalReasoningCalls([]);
                pendingCallsRef.current = [];
              }
            }
            break;
          }

          // B) conversation.item.created
          // case "conversation.item.created": {
          //   const text = event.item?.content?.text?.trim();
          //   const roleStr = event.item?.role ?? "system";
          //   const itemId = event.item?.id;
          //   console.debug(
          //     `[WebRTC] conversation.item.created: role="${roleStr}", text="${text}", itemId=${itemId}`
          //   );

          //   if (text && roleStr) {
          //     const messageRole =
          //       roleStr === "assistant"
          //         ? "assistant"
          //         : roleStr === "user"
          //         ? "user"
          //         : "system";

          //     // ───── Unified Duplicate Check ─────
          //     const newTimestamp = new Date().toISOString();
          //     const isDuplicate = conversationRef.current.some((existingMsg) => {
          //       const sameRole = existingMsg.role === messageRole;
          //       const sameContent = existingMsg.content.trim() === text;
          //       const timeDiff = Math.abs(
          //         new Date(existingMsg.timestamp).getTime() - new Date(newTimestamp).getTime()
          //       );
          //       return sameRole && sameContent && timeDiff < 2000;
          //     });

          //     console.debug("[WebRTC] item.created -> isDuplicate?", isDuplicate);

          //     if (!isDuplicate) {
          //       addMessage(messageRole, text);
          //     } else {
          //       console.debug("[WebRTC] Skipped adding duplicate item.created message");
          //     }
          //   }
          //   break;
          // }

          // C) response.done
          case "response.done": {
            console.debug("[WebRTC] response.done event:", event.response);
            if (event.response?.output) {
              event.response.output.forEach((outputItem) => {
                if (
                  outputItem.type === "function_call" &&
                  outputItem.name === "medical_reasoning"
                ) {
                  const callId = outputItem.call_id ?? outputItem.id;
                  console.debug(
                    "[WebRTC] Detected function_call for medical_reasoning, callId:",
                    callId,
                  );
                  if (callId) {
                    setPendingMedicalReasoningCalls((prev) => [
                      ...prev,
                      callId,
                    ]);
                    pendingCallsRef.current.push(callId);

                    // Mute ourselves
                    if (audioStream.current) {
                      audioStream.current
                        .getAudioTracks()
                        .forEach((track) => (track.enabled = false));
                      setWebRTCState((prev) => ({ ...prev, isMuted: true }));
                    }
                  }
                } else if (outputItem.type === "text" && outputItem.text) {
                  console.debug(
                    "[WebRTC] response.done -> text:",
                    outputItem.text,
                  );
                  addMessage("assistant", outputItem.text.trim());
                }
              });
            }
            break;
          }

          // D) error
          case "error":
            console.error("[WebRTC] event.error:", event.error);
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
      console.error("[WebRTC] Initialization error:", error);
      setWebRTCState((prev) => ({
        ...prev,
        error:
          error instanceof Error
            ? error.message
            : "Failed to initialize connection",
        isLoading: false,
        isConnecting: false,
      }));
      throw error;
    }
  };

  const connect = async (userName?: string) => {
    try {
      setWebRTCState((prev) => ({ ...prev, isConnecting: true }));
      // Only pass userName if it exists and isn't empty
      await initializeConnection(userName?.trim() ?? undefined);
    } catch (error) {
      console.error("WebRTC connection error:", error);
      setWebRTCState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to connect",
        isConnecting: false,
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
    console.debug("[WebRTC] Attempting to send message:", message);
    if (dataChannel.current?.readyState === "open") {
      console.debug("[WebRTC] DataChannel is open, sending message");
      dataChannel.current.send(JSON.stringify(message));
      console.debug("[WebRTC] Message sent successfully");
    } else {
      console.error("[WebRTC] Cannot send message - data channel not open");
    }
  };

  const sendUserMessage = (text: string) => {
    console.debug("[WebRTC] sendUserMessage called with text:", text);
    console.debug(
      "[WebRTC] DataChannel state:",
      dataChannel.current?.readyState,
    );

    if (dataChannel.current?.readyState === "open") {
      console.debug(
        "[WebRTC] Current conversation state before send:",
        conversationRef.current,
      );

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

      console.debug(
        "[WebRTC] Current conversation state after send:",
        conversationRef.current,
      );
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
      isConnecting: false,
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
    connect,
    disconnect,
    sendMessage,
    sendUserMessage,
    toggleMic,
    pauseSession,
    resumeSession,
    isMuted: webRTCState.isMuted,
  };
};
