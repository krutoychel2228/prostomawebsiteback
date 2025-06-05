import { Request, Response } from "express";
import { IUser } from "../mongoose/schemas/User"; 
import { NotificationModel } from "../mongoose/schemas/Notification";
import mongoose from "mongoose";

interface NotificationResponse {
    _id: mongoose.Types.ObjectId;
    type: "commentOnPost" | "replyToComment" | "replyToReply";
    postId: mongoose.Types.ObjectId;
    commentId?: mongoose.Types.ObjectId | null;
    replyId?: mongoose.Types.ObjectId | null;
    parentReplyId?: mongoose.Types.ObjectId | null;
    read: boolean;
    createdAt: Date;
    updatedAt: Date;
    sender: {
        username: string;
        profilePicture?: string;
    };
}

export const getNotifications = async (req: Request, res: Response) => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Unauthorized' });
            return
        }
        const user = req.user as IUser;

        const pipeline = [
            { $match: { recipientId: user._id } },
            { $sort: { createdAt: -1 } },
            {
                $lookup: {
                    from: "users",
                    localField: "senderId",
                    foreignField: "_id",
                    as: "sender"
                }
            },
            { $unwind: "$sender" },
            {
                $lookup: {
                    from: "comments",
                    localField: "commentId",
                    foreignField: "_id",
                    as: "comment"
                }
            },
            {
                $lookup: {
                    from: "replies",
                    localField: "replyId",
                    foreignField: "_id",
                    as: "reply"
                }
            },
            {
                $addFields: {
                    commentText: { $arrayElemAt: ["$comment.text", 0] },
                    replyText: { $arrayElemAt: ["$reply.text", 0] },
                    bodyText: {
                        $switch: {
                            branches: [
                                {
                                    case: { $eq: ["$type", "commentOnPost"] },
                                    then: { $arrayElemAt: ["$comment.text", 0] }
                                },
                                {
                                    case: {
                                        $or: [
                                            { $eq: ["$type", "replyToComment"] },
                                            { $eq: ["$type", "replyToReply"] }
                                        ]
                                    },
                                    then: { $arrayElemAt: ["$reply.text", 0] }
                                }
                            ],
                            default: "Unknown content"
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 1,
                    type: 1,
                    postId: 1,
                    commentId: 1,
                    replyId: 1,
                    parentReplyId: 1,
                    read: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    sender: {
                        username: "$sender.username",
                        profilePicture: "$sender.profilePicture"
                    },
                    bodyText: 1
                }
            }
        ];

        const notifications = await NotificationModel.aggregate(pipeline as any).exec();
        res.status(200).json(notifications as NotificationResponse[]);

    } catch (error) {
        console.error("Error fetching notifications:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const readNotification = async (req: Request, res: Response) => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        const notificationId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(notificationId)) {
            res.status(400).json({ message: 'Invalid notification ID' });
            return;
        }

        const user = req.user as IUser;

        const notification = await NotificationModel.findOneAndUpdate(
            {
                _id: notificationId,
                recipientId: user._id
            },
            {
                $set: { read: true, updatedAt: new Date() }
            },
            {
                new: true
            }
        );

        if (!notification) {
            res.status(404).json({ message: 'Notification not found or not authorized' });
            return;
        }

        const unreadCount = await NotificationModel.countDocuments({
            recipientId: user._id,
            read: false
        });

        try {
            if ((req as any).io) {
                (req as any).io.to(user._id.toString()).emit('notification_count', {
                    count: unreadCount
                });
            } else {
                console.warn('WebSocket server not available for notification update');
            }
        } catch (wsError) {
            console.error('WebSocket emit error:', wsError);
        }

        res.status(200).json({
            message: 'Notification marked as read',
            notification,
            unreadCount 
        });

    } catch (error) {
        console.error("Error marking notification as read:", error);
        res.status(500).json({ message: "Server error" });
    }
};