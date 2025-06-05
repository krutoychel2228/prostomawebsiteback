import { Socket } from 'socket.io';
import { IncomingMessage } from 'http';

export const socketAuthMiddleware = (socket: Socket, next: (err?: Error) => void) => {
    const session = (socket.request as IncomingMessage & {
        session?: any & {
            passport?: {
                user?: string
            }
        }
    }).session;

    if (session && session.passport?.user) {
        socket.data.userId = session.passport.user;
        return next();
    }
    next(new Error('Unauthorized'));
};