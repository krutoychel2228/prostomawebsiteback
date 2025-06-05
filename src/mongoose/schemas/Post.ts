import mongoose, { Schema } from "mongoose"

const ContentBlockSchema = new Schema({
    type: {
        type: String,
        required: true,
        enum: ["subheading", "text", "bulletpoint", "picture"]
    },
    content: {
        type: String,
        required: true
    },
})

const PostSchema = new Schema({
    image: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    content: { type: [ContentBlockSchema], required: true },
})

type ContentBlock = {
    type: "subheading" | "text" | "bulletpoint" | "picture"
    content: string
}

type Post = {
    image: string
    title: string
    description: string
    content: ContentBlock[]
}

interface IPostDocument extends Post, Document { }

export const PostModel = mongoose.model<IPostDocument>("Post", PostSchema)