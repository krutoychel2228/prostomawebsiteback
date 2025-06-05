import mongoose, { Schema, Document, Types } from "mongoose";

const VideoSchema = new Schema({
    rutubeUrl: {
        type: String,
        required: true,
        trim: true,
        validate: {
            validator: (value: string) => {
                return /^(https?:\/\/)?(www\.)?rutube\.ru\/.+$/.test(value);
            },
            message: 'Please provide a valid Rutube URL'
        }
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
}, {
    timestamps: true
});

export interface IVideo extends Document {
    _id: Types.ObjectId;
    rutubeUrl: string;
    title: string;
    description: string;
    createdAt: Date;
    updatedAt: Date;
    __v?: number;
}

const Video = mongoose.model<IVideo>('Video', VideoSchema);

export default Video;