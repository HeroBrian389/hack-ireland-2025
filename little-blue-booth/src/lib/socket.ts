import { Server as NetServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { NextApiResponse } from 'next';

export type NextApiResponseWithSocket = NextApiResponse & {
    socket: {
        server: NetServer & {
            io?: SocketIOServer;
        };
    };
};

export const initSocket = (res: NextApiResponseWithSocket) => {
    if (!res.socket.server.io) {
        const io = new SocketIOServer(res.socket.server, {
            path: '/api/socket',
            addTrailingSlash: false,
            cors: {
                origin: '*',
                methods: ['GET', 'POST'],
            },
        });

        // Define socket event handlers
        io.on('connection', (socket) => {
            console.log('Client connected:', socket.id);

            socket.on('subscribe-to-conversation', (conversationId: string) => {
                socket.join(`conversation-${conversationId}`);
                console.log(`Client ${socket.id} subscribed to conversation ${conversationId}`);
            });

            socket.on('disconnect', () => {
                console.log('Client disconnected:', socket.id);
            });
        });

        res.socket.server.io = io;
    }
    return res.socket.server.io;
}; 