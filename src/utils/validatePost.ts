import { body, validationResult } from 'express-validator'
import { Request, Response, NextFunction } from 'express'

export const validatePost = [
    body('title')
        .notEmpty().withMessage('Укажите заголовок')
        .isLength({ max: 128 }).withMessage('Заголовок должен быть не длиннее 128 символов'),
    body('description')
        .notEmpty().withMessage('Укажите описание')
        .isLength({ max: 512 }).withMessage('Описание должно быть не длиннее 512 символов'),

    body('content')
        .notEmpty().withMessage('Укажите содержимое')
        .customSanitizer((content) => {
            try {
                return JSON.parse(content)
            } catch (error) {
                throw new Error('Содержимое должно быть валидным JSON')
            }
        })
        .isArray({ min: 1 }).withMessage('Содержимое должно содержать хотя бы один элемент')
        .custom((content) => {
            for (const block of content) {
                if (!block.type || !block.content) {
                    throw new Error('Каждый блок содержимого должен иметь тип и содержание')
                }
                if (!['subheading', 'text', 'bulletpoint', 'picture'].includes(block.type)) {
                    throw new Error('Недопустимый тип блока содержимого')
                }
            }
            return true
        }),

    (req: Request, res: Response, next: NextFunction) => {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            const errorResponse: any = {}
            errors.array().forEach((error: any) => {
                errorResponse[error.path] = error.msg
            })
            res.status(400).json(errorResponse)
            return
        }
        next()
    },
]