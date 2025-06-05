import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

export const validatePostUpdate = [
    // Validate title (optional)
    body('title')
        .optional()
        .notEmpty().withMessage('Укажите заголовок')
        .isLength({ max: 128 }).withMessage('Заголовок должен быть не длиннее 128 символов'),

    // Validate description (optional)
    body('description')
        .optional()
        .notEmpty().withMessage('Укажите описание')
        .isLength({ max: 512 }).withMessage('Описание должно быть не длиннее 512 символов'),

    // Validate content (optional)
    body('content')
        .optional()
        .notEmpty().withMessage('Укажите содержимое')
        .customSanitizer((content) => {
            // If content is already an array, return it as-is
            if (Array.isArray(content)) {
                return content;
            }
            // Otherwise, try to parse it as JSON
            try {
                return JSON.parse(content);
            } catch (error) {
                return null; // Return null if parsing fails
            }
        })
        .custom((content) => {
            if (content === null) {
                return Promise.reject('Содержимое должно быть валидным JSON');
            }
            return true;
        })
        .isArray({ min: 1 }).withMessage('Содержимое должно содержать хотя бы один элемент')
        .custom((content) => {
            for (const block of content) {
                if (!block.type || !block.content) {
                    return Promise.reject('Каждый блок содержимого должен иметь тип и содержание');
                }
                if (!['subheading', 'text', 'bulletpoint', 'picture'].includes(block.type)) {
                    return Promise.reject('Недопустимый тип блока содержимого');
                }
            }
            return true;
        }),

    // Handle validation errors
    (req: Request, res: Response, next: NextFunction) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const errorResponse: any = {};
            errors.array().forEach((error: any) => {
                errorResponse[error.path] = error.msg;
            });
            res.status(400).json(errorResponse);
            return;
        }
        next();
    },
];