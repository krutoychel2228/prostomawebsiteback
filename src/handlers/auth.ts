import { NextFunction, Request, Response } from "express"
import User, { IUser } from "../mongoose/schemas/User"
import bcrypt from 'bcrypt'
import passport from "passport"

export async function registerUser(req: Request, res: Response) {
    try {
        const { username, email, password } = req.body

        const existingUser = await User.findOne({
            $or: [{ username }, { email }],
        })
        if (existingUser) {
            res.status(400).json({ message: 'Аккаунт с таким псевдонимом или почтой уже существует' })
            return
        }

        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password, salt)
        const lowercaseUsername = username.toLowerCase()

        const newUser = new User({
            username: lowercaseUsername,
            email,
            password: hashedPassword
        })

        await newUser.save()

        req.login(newUser, (err) => {
            if (err) {
                console.error('Error during login:', err)
                res.status(500).json({ message: 'Ошибка при регистрации', error: err.message })
                return
            }

            res.status(201).json({
                message: 'Пользователь успешно зарегистрирован',
                user: {
                    id: newUser._id,
                    username: newUser.username,
                    email: newUser.email,
                },
            })
            return
        })
    } catch (err: any) {
        res.status(500).json({ message: 'Registration failed', error: err.message })
    }
}

export function loginUser(req: Request, res: Response, next: NextFunction) {
    if (!req.body.email || !req.body.password) {
        res.status(400).json({
            success: false,
            error: "Введите пароль и email",
        })
        return
    }

    passport.authenticate("local", (err: Error, user: IUser, info: any) => {
        if (err) {
            return res.status(500).json({
                error: "Internal server error during authentication",
            })
        }

        if (!user) {
            res.status(401).json({
                success: false,
                error: info.message || "Authentication failed",
            })
            return
        }

        req.login(user, (err) => {
            if (err) {
                res.status(500).json({
                    success: false,
                    error: "Failed to create session",
                })
                return
            }

            res.status(200).json({
                message: "Успешный вход в аккаунт",
                user: {
                    id: user._id
                },
            })
            return
        })
    })(req, res, next)
}

export function logoutUser(req: Request, res: Response) {
    req.logout((err) => {
        if (err) {
            res.status(500).json({
                error: "Internal server error",
            })
            console.log('Failed to log out')
            return
        }

        req.session.destroy((err) => {
            if (err) {
                res.status(500).json({
                    error: "Internal server error",
                })
                console.log("Failed to destroy session")
                return
            }

            res.clearCookie("connect.sid")

            res.status(200).json({
                message: "Успешно совершен выход из аккаунта",
            })
            return
        })
    })
}

export function getStatus(req: Request, res: Response) {
    req.user ? res.send(req.user) : res.sendStatus(401)
    return
}