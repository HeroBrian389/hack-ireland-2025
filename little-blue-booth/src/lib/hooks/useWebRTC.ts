"use client";

import { useState, useEffect, useRef } from 'react';
import { useConversation, Message } from '../context/ConversationContext';

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

export const useWebRTC = () => {
  const { state, addMessage, clearMessages } = useConversation();
  const [webRTCState, setWebRTCState] = useState<WebRTCState>({
    isConnected: false,
    isLoading: false,
    error: null,
    isMuted: false
  });
  
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const dataChannel = useRef<RTCDataChannel | null>(null);
  const audioElement = useRef<HTMLAudioElement | null>(null);
  const audioStream = useRef<MediaStream | null>(null);
  const conversationRef = useRef<Message[]>(state.messages);
  
  // Track pending medical reasoning calls using both state and ref
  const [pendingMedicalReasoningCalls, setPendingMedicalReasoningCalls] = useState<string[]>([]);
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
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setWebRTCState(prev => ({ ...prev, isMuted: !prev.isMuted }));
    }
  };

  const initializeConnection = async () => {
    try {
      setWebRTCState(prev => ({ ...prev, isLoading: true, error: null }));

      // Get session ID from your server
      const tokenResponse = await fetch("/api/session");
      const data = await tokenResponse.json();

      const EPHEMERAL_KEY = data.client_secret.value;

      if (!EPHEMERAL_KEY) {
        throw new Error('Failed to get valid ephemeral key');
      }

      // Create peer connection
      const pc = new RTCPeerConnection();
      peerConnection.current = pc;

      // Set up data channel
      const dc = pc.createDataChannel("oai-events");
      dataChannel.current = dc;
      
      dc.onopen = () => {
        setWebRTCState(prev => ({ ...prev, isConnected: true }));
        // Configure the available tools when connection is established
        sendMessage({
          type: "session.update",
          session: {
            tools: [
              {
                type: "function",
                name: "medical_reasoning",
                description: "Analyze the conversation for medical insights and provide medical reasoning.",
                parameters: {
                  type: "object",
                  properties: {},
                  required: []
                }
              }
            ],
            tool_choice: "auto"
          }
        });
      };

      dc.onmessage = (e) => {
        const event = JSON.parse(e.data);
        console.log('[WebRTC] Received raw event:', event);

        console.log('[WebRTC] Current conversation state:', conversationRef.current);

        switch (event.type) {
          case 'conversation.item.input_audio_transcription.completed':
            console.log('[WebRTC] Processing transcription:', event.transcript);
            if (event.transcript) {
              // Create the message object
              const newMessage = {
                role: 'user' as const,
                content: event.transcript,
                timestamp: new Date().toISOString()
              };
              
              // Add message to conversation
              addMessage('user', event.transcript);
              console.log('[WebRTC] Added transcribed message to conversation');

              // Use the ref to check for pending calls
              const pendingCalls = pendingCallsRef.current;
              if (pendingCalls.length > 0) {
                console.log('[WebRTC] Processing pending medical reasoning calls:', pendingCalls);
                pendingCalls.forEach((callId) => {
                  console.log('[WebRTC] Initiating medical reasoning for call:', callId);
                  // Pass the new message along with current conversation
                  doMedicalReasoning(callId, newMessage);
                });
                // Clear pending calls from both state and ref
                setPendingMedicalReasoningCalls([]);
                pendingCallsRef.current = [];
              } else {
                console.log('[WebRTC] No pending medical reasoning calls to process');
              }
            }
            break;

          case 'conversation.item.created':
            console.log('[WebRTC] Processing conversation.item.created:', event.item);
            if (event.item?.content?.text) {
              const role = event.item.role === 'assistant' ? 'assistant' : 
                          event.item.role === 'user' ? 'user' : 'system';
              console.log('[WebRTC] Adding message to conversation:', { role, text: event.item.content.text });
              addMessage(role, event.item.content.text);
              // Add debug logging after adding message
              console.log('[WebRTC] Updated conversation state after adding message:', state.messages);
            }
            break;

          case 'response.done':
            console.log('[WebRTC] Processing response.done:', event.response);
            if (event.response?.output) {
              event.response.output.forEach((outputItem: { 
                type: string; 
                text?: string; 
                name?: string; 
                arguments?: string;
                call_id?: string;
                id?: string;  // Add id to the type
              }) => {
                console.log('[WebRTC] Processing output item:', outputItem);
                if (outputItem.type === 'function_call' && outputItem.name === 'medical_reasoning') {
                  const callId = outputItem.call_id || outputItem.id;
                  console.log('[WebRTC] Medical reasoning function call detected:', { outputItem, callId });
                  if (callId) {
                    // Update both state and ref
                    setPendingMedicalReasoningCalls(prev => [...prev, callId]);
                    pendingCallsRef.current = [...pendingCallsRef.current, callId];
                    if (audioStream.current) {
                      const audioTracks = audioStream.current.getAudioTracks();
                      audioTracks.forEach(track => {
                        track.enabled = false;
                      });
                      setWebRTCState(prev => ({ ...prev, isMuted: true }));
                    }
                  } else {
                    console.error('[WebRTC] No call_id found in medical_reasoning function call:', outputItem);
                  }
                } else if (outputItem.type === 'text' && outputItem.text) {
                  console.log('[WebRTC] Adding assistant message:', outputItem.text);
                  addMessage('assistant', outputItem.text);
                }
              });
            }
            break;

          case 'error':
            console.error('[WebRTC] Received error event:', event.error);
            addMessage('system', `Error: ${event.error}`);
            break;
        }
      };

      // Set up audio handling
      if (!audioElement.current) {
        audioElement.current = new Audio();
        audioElement.current.autoplay = true;
      }

      pc.ontrack = (e) => {
        if (audioElement.current) {
          audioElement.current.srcObject = e.streams[0];
        }
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: true
      });
      audioStream.current = mediaStream;
      mediaStream.getTracks().forEach(track => {
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
          "Content-Type": "application/sdp"
        },
      });

      const answer: RTCSessionDescriptionInit = {
        type: 'answer',
        sdp: await sdpResponse.text(),
      };
      await pc.setRemoteDescription(answer);

      setWebRTCState(prev => ({ ...prev, isLoading: false }));
    } catch (error) {
      console.error('WebRTC initialization error:', error);
      setWebRTCState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to initialize WebRTC'
      }));
    }
  };

  const pauseSession = async () => {
    if (audioStream.current) {
      const audioTracks = audioStream.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = false;
      });
      setWebRTCState(prev => ({ ...prev, isMuted: true }));
    }

    // Optionally send a message to indicate reasoning in progress
    if (dataChannel.current?.readyState === 'open') {
      const pauseMessage = {
        type: "response.create",
        response: {
          modalities: ["text"],
          instructions: "Please wait while I analyze the information provided...",
        },
      };
      dataChannel.current.send(JSON.stringify(pauseMessage));
    }
  };

  const resumeSession = async () => {
    if (audioStream.current) {
      const audioTracks = audioStream.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = true;
      });
      setWebRTCState(prev => ({ ...prev, isMuted: false }));
    }
  };

  const sendMessage = (message: WebRTCMessage) => {
    if (dataChannel.current?.readyState === 'open') {
      dataChannel.current.send(JSON.stringify(message));
      
      // Add user message to history for different message types
      if (message.type === 'conversation.item.create' && message.item?.content?.text) {
        addMessage('user', message.item.content.text);
      } else if (message.type === 'response.create' && message.response?.instructions) {
        addMessage('user', message.response.instructions);
      }
    }
  };

  const sendUserMessage = (text: string) => {
    console.log('[WebRTC] Attempting to send user message:', text);
    console.log('[WebRTC] DataChannel state:', dataChannel.current?.readyState);
    
    if (dataChannel.current?.readyState === 'open') {
      console.log('[WebRTC] Current messages before sending:', state.messages);
      
      const messagePayload = {
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: {
            type: "text",
            text: text
          }
        }
      };
      console.log('[WebRTC] Sending message payload:', messagePayload);
      sendMessage(messagePayload);
      
      console.log('[WebRTC] Requesting response from model');
      sendMessage({
        type: "response.create"
      });
      
      console.log('[WebRTC] Messages after sending:', state.messages);
    } else {
      console.error('[WebRTC] Cannot send message - data channel not open');
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
      isMuted: false
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
      console.log('[WebRTC] Current messages state before API call:', conversationRef.current);
      
      // Combine existing conversation with the latest message
      const conversation = [
        ...conversationRef.current,
        ...(latestMessage ? [latestMessage] : [])
      ].map(msg => ({
        ...msg,
        timestamp: new Date(msg.timestamp).toISOString()
      }));

      console.log('[WebRTC] Formatted conversation for reason API:', conversation);
      
      if (conversation.length === 0) {
        throw new Error('No conversation available for analysis');
      }

      const response = await fetch('/api/reason', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation })
      });
      
      const data = await response.json();
      console.log('[WebRTC] Reason API response:', data);

      // Unmute the mic after getting the response
      if (audioStream.current) {
        const audioTracks = audioStream.current.getAudioTracks();
        audioTracks.forEach(track => {
          track.enabled = true;
        });
        setWebRTCState(prev => ({ ...prev, isMuted: false }));
      }

      if (data.success) {
        console.log('[WebRTC] Sending function call output back to model');
        sendMessage({
          type: "conversation.item.create",
          item: {
            type: "function_call_output",
            call_id: callId,
            output: JSON.stringify({ analysis: data.analysis })
          }
        });

        console.log('[WebRTC] Requesting new response from model');
        sendMessage({
          type: "response.create"
        });
      } else {
        console.error('[WebRTC] Medical reasoning API call failed:', data);
        addMessage('system', 'Medical reasoning tool call failed.');
      }
    } catch (err) {
      console.error('[WebRTC] Medical reasoning error:', err);
      addMessage('system', 'Error during medical reasoning.');
      
      // Also unmute the mic in case of error
      if (audioStream.current) {
        const audioTracks = audioStream.current.getAudioTracks();
        audioTracks.forEach(track => {
          track.enabled = true;
        });
        setWebRTCState(prev => ({ ...prev, isMuted: false }));
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
    isMuted: webRTCState.isMuted
  };
}; 