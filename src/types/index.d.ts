import * as express from 'express'
import { IUser } from '../mongoose/schemas/User'

declare global {
    namespace Express {
        interface User extends IUser {
        }
        interface Request {
            io?: Server;
        }
    }
}

export { }