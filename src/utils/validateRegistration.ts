import { NextFunction, Request, Response } from "express"
import { body, validationResult } from "express-validator"

export const validateRegistration = [
    body('username')
        .notEmpty().withMessage('Укажите псевдоним')
        .isLength({ min: 3, max: 16 }).withMessage('Псевдоним должен быть длиной от 3 до 16 символов')
        .isAlphanumeric().withMessage('Псведоним должен содержать только буквы и цифры'),
    body('email')
        .notEmpty().withMessage('Укажите почту')
        .isLength({ max: 64 }).withMessage('Слишком длинная почта')
        .isEmail().withMessage('Неправильный формат почты'),
    body('password')
        .notEmpty().withMessage('Укажите пароль')
        .isLength({ min: 8, max: 64 }).withMessage('Пароль должен быть длиной от 8 до 64 символов')
        .matches(/[A-ZА-Я]/).withMessage('Пароль должен содержать хотя бы одну заглавную букву')
        .matches(/[a-zа-я]/).withMessage('Пароль должен содержать хотя бы одну маленькую букву')
        .matches(/[0-9]/).withMessage('Пароль должен содержать хотя бы одну цифру')
        .matches(/[!@#$%^&*()_\-+=]/).withMessage('Пароль должен содержать хотя бы один из этих символов: !@#$%^&*()_-+=')
        .not().matches(/[^A-Za-zА-Яа-я0-9!@#$%^&*()_\-+=]/).withMessage('Пароль содержит неразрешенные особые символы'),
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
    }
]