import mongoose from 'mongoose'
import { createApp } from './createApp'

mongoose.connect(process.env.MONGODB_URI!)
    .then(() => console.log("Connected to database"))
    .catch((err) => console.log(err))

const { app } = createApp()


const PORT = process.env.PORT || 3000

console.log()

app.listen(PORT, () => {
    console.log(`Running on Port ${PORT}`)
})