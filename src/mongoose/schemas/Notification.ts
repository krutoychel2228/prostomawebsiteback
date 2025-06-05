import mongoose, { Schema, Document } from "mongoose";

const NotificationSchema = new Schema({
    recipientId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    senderId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    type: {
        type: String,
        required: true,
        enum: ["commentOnPost", "replyToComment", "replyToReply"]
    },
    postId: { type: Schema.Types.ObjectId, required: true, ref: "ForumPost" },
    commentId: { type: Schema.Types.ObjectId, ref: "Comment" },
    replyId: { type: Schema.Types.ObjectId, ref: "Reply" },
    parentReplyId: { type: Schema.Types.ObjectId, ref: "Reply" },
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

type Notification = {
    recipientId: mongoose.Types.ObjectId;
    senderId: mongoose.Types.ObjectId;
    type: "commentOnPost" | "replyToComment" | "replyToReply";
    postId: mongoose.Types.ObjectId;
    commentId?: mongoose.Types.ObjectId | null;
    replyId?: mongoose.Types.ObjectId | null;
    parentReplyId?: mongoose.Types.ObjectId | null;
    read: boolean;
    createdAt: Date;
    updatedAt: Date;
};

interface INotificationDocument extends Notification, Document { }

export const NotificationModel = mongoose.model<INotificationDocument>("Notification", NotificationSchema);