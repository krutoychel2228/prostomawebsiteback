import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { Request, Response } from 'express'
import bcrypt from 'bcrypt'
import User, { IUser } from '../mongoose/schemas/User'
import dotenv from 'dotenv'
import crypto from 'crypto'
import nodemailer from 'nodemailer'

dotenv.config()

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../media'))
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
        cb(null, uniqueSuffix + '-' + file.originalname) 
    },
})

const upload = multer({ storage })

const isValidEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

export const updateUser = [
    upload.single('profilePicture'),
    async (req: Request, res: Response) => {
        if (!req.isAuthenticated()) {
            res.status(401).json({ message: "Пользователь не авторизован" });
            return
        }

        try {
            const updates = req.body;
            const user = await User.findById((req.user as unknown as IUser)._id);

            if (!user) {
                res.status(404).json({ message: 'Пользователь не найден' });
                return
            }

            const allowedUpdates = ['username', 'email', 'birthDate', 'phone', 'gender',
                'telegram', 'vkontakte', 'odnoklassniki', 'fullName'];

            if (updates.password) {
                res.status(400).json({
                    message: 'Используйте /change-password для смены пароля'
                });
                return
            }

            const isValidOperation = Object.keys(updates).every(update =>
                allowedUpdates.includes(update)
            );

            if (!isValidOperation) {
                res.status(400).json({
                    message: 'Недопустимые поля для обновления'
                });
                return
            }

            if (updates.gender === 'unspecified') updates.gender = null;

            if (req.file) {
                
                if (user.profilePicture && !user.profilePicture.includes('defaultprofile')) {
                    const oldImagePath = path.join(__dirname, '..', user.profilePicture);
                    fs.unlink(oldImagePath, (err) => {
                        if (err) console.error('Ошибка удаления старого изображения:', err);
                    });
                }
                updates.profilePicture = `/media/${req.file.filename}`;
            }

            
            Object.assign(user, updates);
            await user.save();

            
            const userObject = user.toObject();
            const { password, ...userWithoutPassword } = userObject;

            res.status(200).json({
                message: 'Профиль успешно обновлен',
                user: userWithoutPassword,
            });
            return

        } catch (err: any) {
            res.status(500).json({
                message: 'Ошибка при обновлении профиля',
                error: err.message
            });
            return
        }
    }
];

export const changePassword = [
    async (req: Request, res: Response) => {
        if (!req.isAuthenticated()) {
            res.status(401).json({ message: "Пользователь не авторизован" });
            return
        }

        try {
            const { currentPassword, newPassword } = req.body;

            console.log(req.body)

            if (!currentPassword || !newPassword) {
                res.status(400).json({
                    message: 'Требуется текущий и новый пароль'
                });
                return
            }

            const user = await User.findById((req.user as unknown as IUser)._id);
            if (!user) {
                res.status(404).json({ message: 'Пользователь не найден' });
                return
            }

            
            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) {
                res.status(401).json({
                    message: 'Текущий пароль неверный'
                });
                return
            }

            
            if (newPassword.length < 8) {
                res.status(400).json({
                    message: 'Пароль должен содержать минимум 8 символов'
                });
                return
            }

            
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(newPassword, salt);
            await user.save();

            res.status(200).json({
                message: 'Пароль успешно изменен'
            });
            return

        } catch (err: any) {
            res.status(500).json({
                message: 'Ошибка при изменении пароля',
                error: err.message
            });
            return
        }
    }
];

export const deleteUser = async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
        res.status(401).json({ message: "Пользователь не авторизован" })
        return
    }

    try {
        

        
        
        
        
        

        
        const user = await User.findById((req.user as IUser)._id)
        if (!user) {
            res.status(404).json({ message: 'Пользователь не найден' })
            return
        }

        
        
        
        
        
        

        
        if (user.profilePicture && user.profilePicture !== '/media/defaultprofile.png') {
            const oldImagePath = path.join(__dirname, '..', user.profilePicture)
            fs.unlink(oldImagePath, (err) => {
                if (err) {
                    console.error('Failed to delete profile picture:', err)
                }
            })
        }

        
        await User.deleteOne({ _id: (req.user as IUser)._id })

        
        req.logout((err) => {
            if (err) {
                console.error('Error during logout:', err)
                res.status(500).json({ message: 'Ошибка при выходе из аккаунта' })
                return
            }

            
            req.session.destroy((err) => {
                if (err) {
                    console.error('Failed to destroy session:', err)
                    res.status(500).json({ message: 'Ошибка при удалении сессии' })
                    return
                }

                
                res.clearCookie('connect.sid')

                
                res.status(200).json({ message: 'Аккаунт успешно удален' })
            })
        })
    } catch (err: any) {
        res.status(500).json({ message: 'Ошибка при удалении аккаунта', error: err.message })
    }
}

export const getUser = async (req: Request, res: Response) => {

}

export const getMyProfile = async (req: Request, res: Response) => {
    res.json(req.user)
}

export const forgotPassword = async (req: Request, res: Response) => {
    const { email } = req.body;

    if (!email) {
        res.status(400).json({ message: "Введите все поля" });
        return
    }

    if (!isValidEmail(email)) {
        res.status(400).json({ message: "Неверный формат email" });
        return
    }

    try {
        const user = await User.findOne({ email });
        if (!user) {
            
            res.status(200).json({
                message: 'Если такой аккаунт существует, письмо отправлено'
            });
            return
        }

        
        const token = crypto.randomBytes(20).toString('hex');
        user.resetPasswordToken = token;
        user.resetPasswordExpires = new Date(Date.now() + 3600000); 

        await user.save();

        
        const transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: process.env.GMAIL_USERNAME, 
                pass: process.env.GMAIL_APP_PASSWORD  
            }
        });

        
        const mailOptions = {
            to: user.email,
            from: process.env.EMAIL_USERNAME || 'noreply@yourdomain.com',
            subject: 'Сброс пароля',
            text: `Вы получили это письмо, потому что запросили сброс пароля.\n\n
                Пожалуйста, перейдите по следующей ссылке, чтобы завершить процесс:\n\n
                ${process.env.CLIENT_URL}reset-password/${token}\n\n
                Если вы не запрашивали сброс пароля, проигнорируйте это письмо.\n`
        };

        
        await transporter.sendMail(mailOptions);

        res.status(200).json({
            message: 'Если такой аккаунт существует, письмо отправлено'
        });

    } catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({
            message: 'Произошла ошибка при обработке запроса'
        });
    }
};

export const resetPassword = [
    async (req: Request, res: Response) => {
        try {
            const { token, newPassword } = req.body;

            if (!token || !newPassword) {
                res.status(400).json({
                    message: 'Требуется токен и новый пароль'
                });
                return
            }

            
            const user = await User.findOne({
                resetPasswordToken: token,
                resetPasswordExpires: { $gt: Date.now() }
            });

            if (!user) {
                res.status(400).json({
                    message: 'Неверный или просроченный токен сброса пароля'
                });
                return
            }

            
            if (newPassword.length < 8) {
                res.status(400).json({
                    message: 'Пароль должен содержать минимум 8 символов'
                });
                return
            }

            
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(newPassword, salt);

            
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;

            await user.save();

            
            const transporter = nodemailer.createTransport({
                service: 'Gmail',
                auth: {
                    user: process.env.GMAIL_USERNAME, 
                    pass: process.env.GMAIL_APP_PASSWORD  
                }
            });

            await transporter.sendMail({
                to: user.email,
                from: process.env.EMAIL_FROM || 'noreply@yourdomain.com',
                subject: 'Пароль изменен',
                text: `Ваш пароль был успешно изменен.\n\nЕсли вы не совершали это действие, немедленно свяжитесь с поддержкой.`
            });

            res.status(200).json({
                message: 'Пароль успешно изменен'
            });
            return

        } catch (err: any) {
            console.error('Password reset error:', err);
            res.status(500).json({
                message: 'Ошибка при сбросе пароля',
                error: err.message
            });
            return
        }
    }
];