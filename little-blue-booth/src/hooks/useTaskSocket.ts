import { useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface TaskUpdate {
    conversationId: string;
    processed?: boolean;
    analyzed?: boolean;
    reasoned?: boolean;
    message?: string;
    content?: string;
    context?: unknown;
}

interface UseTaskSocketProps {
    conversationId: string;
    onConversationProcessed?: (data: TaskUpdate) => void;
    onAnalysisCompleted?: (data: TaskUpdate) => void;
    onReasoningCompleted?: (data: TaskUpdate) => void;
}

export const useTaskSocket = ({
    conversationId,
    onConversationProcessed,
    onAnalysisCompleted,
    onReasoningCompleted,
}: UseTaskSocketProps) => {
    const connectSocket = useCallback(() => {
        const socket = io({
            path: '/api/socket',
            addTrailingSlash: false,
        });

        socket.on('connect', () => {
            console.log('Connected to socket server');
            socket.emit('subscribe-to-conversation', conversationId);
        });

        socket.on('conversation-processed', (data: TaskUpdate) => {
            console.log('Conversation processed:', data);
            onConversationProcessed?.(data);
        });

        socket.on('analysis-completed', (data: TaskUpdate) => {
            console.log('Analysis completed:', data);
            onAnalysisCompleted?.(data);
        });

        socket.on('reasoning-completed', (data: TaskUpdate) => {
            console.log('Reasoning completed:', data);
            onReasoningCompleted?.(data);
        });

        socket.on('disconnect', () => {
            console.log('Disconnected from socket server');
        });

        socket.on('error', (error) => {
            console.error('Socket error:', error);
        });

        return socket;
    }, [conversationId, onConversationProcessed, onAnalysisCompleted, onReasoningCompleted]);

    useEffect(() => {
        const socket = connectSocket();

        return () => {
            socket.disconnect();
        };
    }, [connectSocket]);
}; 