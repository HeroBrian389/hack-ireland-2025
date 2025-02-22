import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import { Server as SocketIOServer } from 'socket.io';

// Redis connection configuration
const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Define queue names
export const CONVERSATION_QUEUE = 'conversation-tasks';
export const ANALYSIS_QUEUE = 'analysis-tasks';
export const REASONING_QUEUE = 'reasoning-tasks';

// Create queues
export const conversationQueue = new Queue(CONVERSATION_QUEUE, { connection });
export const analysisQueue = new Queue(ANALYSIS_QUEUE, { connection });
export const reasoningQueue = new Queue(REASONING_QUEUE, { connection });

let io: SocketIOServer | null = null;

export const setSocketIO = (socketIO: SocketIOServer) => {
    io = socketIO;
};

const emitTaskUpdate = (conversationId: string, eventType: string, data: any) => {
    if (io) {
        io.to(`conversation-${conversationId}`).emit(eventType, data);
    }
};

// Queue processor functions
const processConversationTask = async (job: any) => {
    const { conversationId, message } = job.data;
    // Implement conversation processing logic here
    console.log(`Processing conversation task: ${conversationId}`);
    
    const result = { processed: true, conversationId, message };
    emitTaskUpdate(conversationId, 'conversation-processed', result);
    return result;
};

const processAnalysisTask = async (job: any) => {
    const { conversationId, content } = job.data;
    // Implement analysis processing logic here
    console.log(`Processing analysis task: ${conversationId}`);
    
    const result = { analyzed: true, conversationId, content };
    emitTaskUpdate(conversationId, 'analysis-completed', result);
    return result;
};

const processReasoningTask = async (job: any) => {
    const { conversationId, context } = job.data;
    // Implement reasoning processing logic here
    console.log(`Processing reasoning task: ${conversationId}`);
    
    const result = { reasoned: true, conversationId, context };
    emitTaskUpdate(conversationId, 'reasoning-completed', result);
    return result;
};

// Create workers
new Worker(CONVERSATION_QUEUE, processConversationTask, { connection });
new Worker(ANALYSIS_QUEUE, processAnalysisTask, { connection });
new Worker(REASONING_QUEUE, processReasoningTask, { connection });

// Helper function to clean up queues
export async function cleanupQueues() {
    await Promise.all([
        conversationQueue.close(),
        analysisQueue.close(),
        reasoningQueue.close(),
    ]);
} 