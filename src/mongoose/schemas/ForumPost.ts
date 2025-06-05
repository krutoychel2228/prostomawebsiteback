import mongoose, { Schema, Document } from "mongoose";

function arrayLimit(val: string[]) {
    return val.length <= 10;
}

const ForumPostSchema = new Schema({
    authorId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    title: { type: String, required: true },
    text: { type: String, required: true },
    attachments: {
        type: [String],
        validate: [arrayLimit, "Максимум  допустимо 10 медиафайлов"],
    },
    commentIds: [{ type: Schema.Types.ObjectId, ref: "Comment" }],
    pinned: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

const CommentSchema = new Schema({
    postId: { type: Schema.Types.ObjectId, required: true, ref: "ForumPost" },
    authorId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    text: { type: String, required: true },
    replyIds: [{ type: Schema.Types.ObjectId, ref: "Reply" }],
    createdAt: { type: Date, default: Date.now },
});

const ReplySchema = new Schema({
    authorId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    text: { type: String, required: true },
    commentId: { type: Schema.Types.ObjectId, required: true, ref: "Comment" },
    replyId: { type: Schema.Types.ObjectId, ref: "Reply" },
    postId: { type: Schema.Types.ObjectId, required: true, ref: "ForumPost" },
    createdAt: { type: Date, default: Date.now },
});

type Reply = {
    authorId: mongoose.Types.ObjectId;
    text: string;
    commentId: mongoose.Types.ObjectId;
    replyId?: mongoose.Types.ObjectId | null;
    postId: mongoose.Types.ObjectId;
    createdAt: Date;
};

type Comment = {
    postId: mongoose.Types.ObjectId;
    authorId: mongoose.Types.ObjectId;
    text: string;
    replyIds: mongoose.Types.ObjectId[]; // Array of reply IDs
    createdAt: Date;
};

type ForumPost = {
    authorId: mongoose.Types.ObjectId;
    title: string;
    text: string;
    attachments: string[];
    commentIds: mongoose.Types.ObjectId[];
    pinned: boolean; // Add this line
    createdAt: Date;
    updatedAt: Date;
};

interface IForumPostDocument extends ForumPost, Document { }
interface ICommentDocument extends Comment, Document { }
interface IReplyDocument extends Reply, Document { }

export const ForumPostModel = mongoose.model<IForumPostDocument>("ForumPost", ForumPostSchema);
export const CommentModel = mongoose.model<ICommentDocument>("Comment", CommentSchema);
export const ReplyModel = mongoose.model<IReplyDocument>("Reply", ReplySchema);