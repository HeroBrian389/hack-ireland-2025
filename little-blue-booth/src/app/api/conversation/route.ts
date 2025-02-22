import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Job, Queue } from 'bullmq';
import { conversationQueue, analysisQueue, reasoningQueue } from './queue';

// Input validation schema
const ConversationInputSchema = z.object({
    conversationId: z.string(),
    message: z.string(),
    context: z.object({
        previousMessages: z.array(z.string()).optional(),
        metadata: z.record(z.unknown()).optional(),
    }).optional(),
});

type ConversationInput = z.infer<typeof ConversationInputSchema>;

interface TaskData {
    conversationId: string;
    message?: string;
    content?: string;
    timestamp?: string;
    context?: unknown;
}

export async function POST(request: Request) {
    try {
        const body = await request.json() as unknown;
        
        // Validate input
        const validatedInput = ConversationInputSchema.parse(body);
        const { conversationId, message, context } = validatedInput;

        // Create tasks in parallel
        const tasks = await Promise.all([
            // Main conversation processing task
            conversationQueue.add('process-conversation', {
                conversationId,
                message,
                timestamp: new Date().toISOString(),
            } as TaskData, {
                priority: 1,
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 1000,
                },
            }),

            // Analysis task
            analysisQueue.add('analyze-conversation', {
                conversationId,
                content: message,
                context: context?.previousMessages,
            } as TaskData, {
                priority: 2,
                attempts: 2,
            }),

            // Reasoning task
            reasoningQueue.add('reason-conversation', {
                conversationId,
                context: {
                    currentMessage: message,
                    metadata: context?.metadata,
                },
            } as TaskData, {
                priority: 3,
                attempts: 2,
            }),
        ]);

        return NextResponse.json({
            success: true,
            message: 'Tasks created successfully',
            taskIds: tasks.map((task: Job<TaskData>) => task.id),
        });

    } catch (error) {
        console.error('Error processing conversation:', error);
        
        if (error instanceof z.ZodError) {
            return NextResponse.json({
                success: false,
                error: 'Invalid input format',
                details: error.errors,
            }, { status: 400 });
        }

        return NextResponse.json({
            success: false,
            error: 'Internal server error',
        }, { status: 500 });
    }
} 