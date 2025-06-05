import express, { Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import routes from './routes/index';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import passport from 'passport';
import MongoStore from 'connect-mongo';
import mongoose from 'mongoose';
import './strategies/local-strategy';
import cors from 'cors';
import loggingMiddleware from './utils/loggingMiddleware';
import path from 'path';
import dontenv from 'dotenv';
import { IncomingMessage } from 'http';
import { socketAuthMiddleware } from './sockets/authMiddleware';
import { handleSocketConnection } from './sockets/connectionHandler';

dontenv.config();

const requiredEnvVars = ['SESSION_SECRET', 'COOKIE_SECRET', 'MONGODB_URI'];
for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
    }
}

export function createApp() {
    const app = express();
    const server = createServer(app);

    const io = new Server(server, {
        cors: {
            origin: true,
            credentials: true,
            methods: ['GET', 'POST']
        },
        transports: ['websocket', 'polling']
    });

    app.use(
        cors({
            origin: true,
            credentials: true,
        })
    );

    app.use(loggingMiddleware);
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(cookieParser(process.env.COOKIE_SECRET));

    // Session configuration
    const sessionMiddleware = session({
        secret: process.env.SESSION_SECRET!,
        saveUninitialized: false,
        resave: true,
        cookie: {
            maxAge: process.env.SESSION_MAX_AGE ? parseInt(process.env.SESSION_MAX_AGE) : 86400000,
            sameSite: 'lax',
            secure: false
        },
        store: MongoStore.create({
            client: mongoose.connection.getClient()
        })
    });

    app.use(sessionMiddleware);
    app.use(passport.initialize());
    app.use(passport.session());

    // Share session with Socket.io
    io.engine.use(sessionMiddleware);
    io.engine.use(passport.initialize());
    io.engine.use(passport.session());

    io.use(socketAuthMiddleware);
    io.on('connection', handleSocketConnection);

    // Make io accessible in routes
    app.use((req: Request & { io?: Server }, res, next) => {
        req.io = io;
        next();
    });

    // Static files
    app.use('/media', express.static(path.join(__dirname, 'media')));

    // Routes
    app.use(routes);

    // Error handling middleware
    app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
        console.error(err.stack);
        res.status(500).send('broked....');
    });

    return { app: server, io };
}