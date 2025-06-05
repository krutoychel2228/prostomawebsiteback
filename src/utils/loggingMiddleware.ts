import { NextFunction, Request, Response } from "express"

export default function loggingMiddleware(req: Request, res: Response, next: NextFunction) {
    const timestamp = new Date().toISOString()
    res.on('finish', () => {
        console.log(`[${timestamp}] ${req.method} ${req.url} | ${res.statusCode}`)
    })
    next()
}