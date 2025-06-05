import passport from "passport"
import { Strategy } from "passport-local"
import bcrypt from 'bcrypt'
import User, { IUser } from "../mongoose/schemas/User"

passport.serializeUser((user, done) => {
    done(null, (user as IUser)._id)

})

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id)
        if (!user) return done(new Error("User Not Found"), null)

        done(null, user)
    } catch (err) {
        done(err, null)
    }
})

export default passport.use(
    new Strategy(
        {
            usernameField: 'email',
        },
        async (email, password, done) => {
            try {
                const user = await User.findOne({
                    email: { $regex: new RegExp(`^${email}$`, "i") },
                })

                if (!user) {
                    return done(null, false, { message: "Неверный email или пароль" })
                }
                if (!password) {
                    return done(null, false, { message: "Введите пароль" })
                }

                const isPasswordValid = await bcrypt.compare(password, user.password)
                if (!isPasswordValid) {
                    return done(null, false, { message: "Неверный email или пароль" })
                }

                return done(null, user)
            } catch (err) {
                return done(err)
            }
        })
)


