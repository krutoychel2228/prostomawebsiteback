import { Session, SessionData } from 'express-session';
import { User } from '../models/user'; // Adjust path to your user model

declare module 'http' {
    interface IncomingMessage {
        session: Session & Partial<SessionData> & {
            passport?: {
                user?: string; // Or your user ID type
            };
        };
    }
}

declare module 'socket.io' {
    interface Socket {
        request: IncomingMessage;
        data: {
            userId?: string; // Or your user ID type
        };
    }
}