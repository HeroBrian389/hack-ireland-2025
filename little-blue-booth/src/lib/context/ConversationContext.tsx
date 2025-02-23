"use client";

import { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { api } from "~/trpc/react";

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  status?: 'completed' | 'pending';
}

interface ConversationState {
  conversationId: string;
  messages: Message[];
}

interface ConversationContextType {
  state: ConversationState;
  addMessage: (role: Message['role'], content: string) => void;
  clearMessages: () => void;
}

const ConversationContext = createContext<ConversationContextType | undefined>(undefined);

type ConversationAction = 
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'CLEAR_MESSAGES' };

const conversationReducer = (state: ConversationState, action: ConversationAction): ConversationState => {
  switch (action.type) {
    case 'ADD_MESSAGE':
      const newState = {
        ...state,
        messages: [...state.messages, action.payload]
      };
      console.log('[ConversationContext] Reducer - New message added:', action.payload);
      console.log('[ConversationContext] Reducer - Full messages array:', newState.messages);
      return newState;
    case 'CLEAR_MESSAGES':
      return {
        ...state,
        messages: []
      };
    default:
      return state;
  }
};

export const ConversationProvider = ({ children }: { children: ReactNode }) => {
  // Initialize with a unique conversationId
  const initialState: ConversationState = {
    conversationId: uuidv4(),
    messages: []
  };

  const [state, dispatch] = useReducer(conversationReducer, initialState);

  // Get the tRPC mutation hook for saving a message
  const addMessageMutation = api.conversation.addMessage.useMutation();

  useEffect(() => {
    console.log('[ConversationContext] Current state:', state.messages);
  }, [state.messages]);

  const addMessage = (role: Message['role'], content: string) => {
    console.log('[ConversationContext] Adding message:', { role, content });
    const timestamp = new Date().toISOString();
    const message: Message = { 
      id: uuidv4(),
      role, 
      content, 
      timestamp 
    };
    
    console.log('[ConversationContext] Created message with full details:', message);
    
    // Add message to local state
    dispatch({
      type: 'ADD_MESSAGE',
      payload: message
    });

    // Log the current messages array after update
    console.log('[ConversationContext] All messages after update:', state.messages.map(msg => ({
      id: msg.id,
      role: msg.role,
      timestamp: msg.timestamp
    })));

    // Save the message to the backend
    try {
      addMessageMutation.mutate({
        conversationId: state.conversationId,
        sender: role,
        messageText: content,
      });
    } catch (error) {
      console.error('[ConversationContext] Failed to save message:', error);
      // You might want to show a toast notification here
    }
  };

  const clearMessages = () => {
    dispatch({ type: 'CLEAR_MESSAGES' });
  };

  return (
    <ConversationContext.Provider value={{ state, addMessage, clearMessages }}>
      {children}
    </ConversationContext.Provider>
  );
};

export const useConversation = () => {
  const context = useContext(ConversationContext);
  if (context === undefined) {
    throw new Error('useConversation must be used within a ConversationProvider');
  }
  return context;
}; 