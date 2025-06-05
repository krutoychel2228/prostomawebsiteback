import { Request, Response } from "express"
import nodemailer from 'nodemailer'
import TelegramBot from 'node-telegram-bot-api'
import dotenv from 'dotenv'
import { SubmissionModel } from "../mongoose/schemas/Submission"
import { IUser } from "../mongoose/schemas/User"
import mongoose from "mongoose"

dotenv.config()

const telegramToken = process.env.TELEGRAM_BOT_TOKEN
const telegramGroupId = process.env.TELEGRAM_GROUP_ID
const bot = new TelegramBot(telegramToken!)

function isValidEmail(email: string): boolean {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return re.test(email)
}

export const submitQuestion = async (req: Request, res: Response) => {
    try {
        const { name, email, question } = req.body

        if (!name || !email || !question) {
            res.status(400).json({ message: "Введите все поля" })
            return
        }

        if (!isValidEmail(email)) {
            res.status(400).json({ message: "Неверный формат email" })
            return
        }

        const newSubmission = new SubmissionModel({
            name,
            email,
            question,
            status: "unread"
        })

        await newSubmission.save()

        const mailOptions = {
            from: process.env.EMAIL_USERNAME,
            to: process.env.ADMIN_USERNAME,
            subject: 'Оставлен новый вопрос',
            text: `
                На портале prostoma оставлен новый вопрос:
                ID: ${newSubmission.displayId}
                Имя: ${name}
                Почта: ${email}
                Вопрос: ${question}
            `,
            html: `
                <h1>На портале prostoma оставлен новый вопрос</h1>
                <p><strong>ID:</strong> ${newSubmission.displayId}</p>
                <p><strong>Имя:</strong> ${name}</p>
                <p><strong>Почта:</strong> ${email}</p>
                <p><strong>Вопрос:</strong> ${question}</p>
            `
        }

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USERNAME,
                pass: process.env.GMAIL_APP_PASSWORD
            }
        })
        await transporter.sendMail(mailOptions)
        await bot.sendMessage(
            telegramGroupId!,
            `📢 Оставлен новый вопрос:\nID: ${newSubmission.displayId}\nИмя: ${name}\nПочта: ${email}\nВопрос: ${question}`
        )

        res.status(200).json({ message: "Question submitted successfully" })

    } catch (error) {
        console.error('Error:', error)
        res.status(500).json({ message: 'Server error' })
    }
}

export const submitAppointmentRequest = async (req: Request, res: Response) => {
    try {
        const { name, phone } = req.body

        if (!name || !phone) {
            res.status(400).json({ message: "Введите все поля" })
            return
        }

        const newSubmission = new SubmissionModel({
            name,
            phone,
            status: "unread"
        })


        await newSubmission.save()

        const mailOptions = {
            from: process.env.EMAIL_USERNAME,
            to: process.env.ADMIN_USERNAME,
            subject: 'Оставлена новая запись',
            text: `
                На портале prostoma оставлена запись:
                ID: ${newSubmission.displayId}
                Имя: ${name}
                Телефон: ${phone}
            `,
            html: `
                <h1>На портале prostoma оставлена запись</h1>
                <p><strong>ID:</strong> ${newSubmission.displayId}</p>
                <p><strong>Имя:</strong> ${name}</p>
                <p><strong>Почта:</strong> ${phone}</p>
            `
        }

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USERNAME,
                pass: process.env.GMAIL_APP_PASSWORD
            }
        })

        await transporter.sendMail(mailOptions)
        await bot.sendMessage(
            telegramGroupId!,
            `📢 Оставлена новая запись:\nID: ${newSubmission.displayId}\nИмя: ${name}\nТелефон: ${phone}`
        )

        res.status(200).json({ message: "Question submitted successfully" })

    } catch (error) {
        console.error('Error:', error)
        res.status(500).json({ message: 'Server error' })
    }
}

export const getSubmissions = async (req: Request, res: Response) => {
    try {
        const user = req.user as IUser
        if (!user || !user.admin) {
            res.status(403).json({
                success: false,
                message: "Доступ запрещён: требуются права администратора"
            })
            return
        }

        const { displayId } = req.query

        const query: any = {}
        if (displayId && !isNaN(Number(displayId))) {
            query.displayId = Number(displayId)
        }

        const submissions = await SubmissionModel.find(query)
            .sort({ createdAt: -1 })
            .lean()

        res.status(200).json({
            success: true,
            data: submissions.map(sub => ({
                ...sub,
                _id: sub._id.toString(),
                email: sub.email || null,
                phone: sub.phone || null
            }))
        })

    } catch (error) {
        console.error('Ошибка при получении вопросов:', error)
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера при получении вопросов'
        })
    }
}

export const switchSubmissionStatus = async (req: Request, res: Response) => {
    try {
        const user = req.user as IUser

        if (!user) {
            res.status(401).json({ success: false, message: 'Не авторизован' })
            return
        }

        if (!user.admin) {
            res.status(403).json({ success: false, message: 'Доступ запрещён: требуются права администратора' })
            return
        }

        const submissionId = req.params.id

        if (!mongoose.Types.ObjectId.isValid(submissionId)) {
            res.status(400).json({ success: false, message: 'Некорректный ID вопроса' })
            return
        }

        const submission = await SubmissionModel.findById(submissionId)

        if (!submission) {
            res.status(404).json({ success: false, message: 'Вопрос не найден' })
            return
        }

        const newStatus = submission.status === 'read' ? 'unread' : 'read'

        const updatedSubmission = await SubmissionModel.findByIdAndUpdate(
            submissionId,
            {
                $set: { status: newStatus },
                $currentDate: { updatedAt: true }
            },
            { new: true }
        )

        res.status(200).json({
            success: true,
            message: `Статус вопроса изменён на "${newStatus === 'read' ? 'прочитано' : 'не прочитано'}"`,
            data: {
                _id: updatedSubmission?._id,
                displayId: updatedSubmission?.displayId,
                status: updatedSubmission?.status,
                updatedAt: updatedSubmission?.updatedAt
            }
        })
        return

    } catch (error) {
        console.error("Ошибка при изменении статуса вопроса:", error)
        res.status(500).json({ success: false, message: "Ошибка сервера" })
        return
    }
}