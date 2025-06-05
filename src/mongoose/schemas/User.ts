import mongoose, { Schema, Document, ObjectId, Types } from "mongoose"

const UserSchema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email address'],
    },
    birthDate: {
        type: Date,
        required: false
    },
    fullName: {
        type: String,
        trim: true,
        require: false
    },
    phone: {
        type: String,
        required: false,
        trim: true
    },
    gender: {
        type: String,
        enum: ['male', 'female'],
        required: false
    },
    telegram: {
        type: String,
        trim: true,
        required: false
    },
    vkontakte: {
        type: String,
        trim: true,
        required: false
    },
    odnoklassniki: {
        type: String,
        trim: true,
        required: false
    },
    profilePicture: {
        type: String,
        required: false
    },
    admin: {
        type: Boolean,
        required: false
    },
    resetPasswordToken: {
        type: String,
        required: false
    },
    resetPasswordExpires: {
        type: Date,
        required: false
    }
}, {
    timestamps: true
})

export interface IUser extends Document {
    _id: Types.ObjectId
    username: string
    email: string
    password: string
    birthDate?: Date | null
    phone?: string | null
    gender?: string | null
    telegram?: string | null
    vkontakte?: string | null
    odnoklassniki?: string | null
    profilePicture?: string | null
    fullName?: string | null
    admin?: boolean | null
    resetPasswordToken?: string | null;
    resetPasswordExpires?: Date | null;
    createdAt: Date
    updatedAt: Date
    __v?: number
}

const User = mongoose.model('User', UserSchema)

export default User