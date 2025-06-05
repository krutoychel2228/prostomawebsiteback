import { Request, RequestHandler, Response } from "express"
import { CommentModel, ForumPostModel, ReplyModel } from "../mongoose/schemas/ForumPost" // Update with correct path
import mongoose, { Types } from "mongoose"
import path from "path"
import multer from "multer"
import { IUser } from "../mongoose/schemas/User"
import fs from 'fs'
import { NotificationModel } from "../mongoose/schemas/Notification"

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../media'))
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
        cb(null, uniqueSuffix + '-' + file.originalname)
    },
})

const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
        files: 10
    },
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/^image\/(jpeg|jpg|png|gif|webp)$/)) {
            return cb(new Error('Only image files are allowed!'))
        }
        cb(null, true)
    }
}).array('attachments', 10)

// Middleware function to handle the upload
const checkAuth: RequestHandler = (req, res, next) => {
    if (!req.user) {
        res.status(403).json({ error: "Пользователь не авторизован" })
        return
    }
    next()
}

const handleUpload: RequestHandler = (req, res, next) => {
    upload(req, res, (err) => {
        if (err) {
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    res.status(400).json({
                        success: false,
                        message: 'File size too large. Max 5MB per file.'
                    })
                    return
                }
                if (err.code === 'LIMIT_FILE_COUNT') {
                    res.status(400).json({
                        success: false,
                        message: 'Too many files. Maximum 10 allowed.'
                    })
                    return
                }
            } else if (err.message === 'Only image files are allowed!') {
                res.status(400).json({
                    success: false,
                    message: err.message
                })
                return
            }
            res.status(500).json({
                success: false,
                message: 'File upload failed',
                error: err.message
            })
            return
        }
        next()
    })
}

// Controller function to create the post
const createPostHandler: RequestHandler = async (req, res) => {
    console.log(req.body)
    try {
        const { title, text, pinned } = req.body;

        if (!title || !text) {
            res.status(400).json({
                success: false,
                message: "Title and text are required"
            });
            return;
        }

        // Check if user is trying to pin post without admin privileges
        if (pinned && !(req.user as IUser)?.admin) {
            res.status(403).json({
                success: false,
                message: "Only admins can pin posts"
            });
            return;
        }

        const attachments = (req.files as Express.Multer.File[])?.map(file =>
            path.join('media', file.filename)
        ) || [];

        const newPost = new ForumPostModel({
            authorId: (req.user as IUser)._id,
            title,
            text,
            attachments,
            commentIds: [],
            pinned: pinned || false // Default to false if not provided
        });

        const savedPost = await newPost.save();

        res.status(201).json({
            success: true,
            message: "Forum post created successfully",
            data: savedPost
        });
        return;
    } catch (error: any) {
        console.error("Error creating forum post:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
        return;
    }
};

// Combined middleware array
export const createForumPost = [checkAuth, handleUpload, createPostHandler] as [
    RequestHandler,
    RequestHandler,
    RequestHandler
]

interface PaginationQuery {
    page?: string;
    limit?: string;
    sort?: 'newest' | 'oldest';
}

interface FilterQuery {
    authorId?: string;
    search?: string;
}

export const getForumPosts = async (req: Request, res: Response) => {
    try {
        // Pagination parameters
        const { page = '1', limit = '10', sort = 'newest', includePinned = 'false' }: PaginationQuery & { includePinned?: string } = req.query;
        const pageNumber = parseInt(page as string, 10);
        const limitNumber = parseInt(limit as string, 10);
        const skip = (pageNumber - 1) * limitNumber;
        const shouldIncludePinned = includePinned === 'true';

        // Filter parameters
        const { authorId, search }: FilterQuery = req.query;

        // Build the query
        const query: any = {};

        if (!shouldIncludePinned) {
            query.pinned = false; // Only show non-pinned posts by default
        }

        if (authorId) {
            if (!mongoose.Types.ObjectId.isValid(authorId as string)) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid authorId format'
                });
                return;
            }
            query.authorId = new mongoose.Types.ObjectId(authorId);
        }

        if (search) {
            query.$or = [
                { title: { $regex: search as string, $options: 'i' } },
                { text: { $regex: search as string, $options: 'i' } }
            ];
        }

        // Rest of the handler remains the same...
        // Sort options
        const sortOptions: Record<string, 1 | -1> = {};
        if (sort === 'newest') {
            sortOptions.createdAt = -1;
        } else if (sort === 'oldest') {
            sortOptions.createdAt = 1;
        }

        // Get total count for pagination metadata
        const totalPosts = await ForumPostModel.countDocuments(query);

        // Get posts with populated data
        const posts = await ForumPostModel.find(query)
            .sort(sortOptions)
            .skip(skip)
            .limit(limitNumber)
            .populate({
                path: 'authorId',
                select: 'username avatar profilePicture'
            })
            .populate({
                path: 'commentIds',
                options: { sort: { createdAt: -1 } },
                populate: [
                    {
                        path: 'authorId',
                        select: 'username avatar profilePicture'
                    },
                    {
                        path: 'replyIds',
                        options: { sort: { createdAt: 1 } },
                        populate: [
                            {
                                path: 'authorId',
                                select: 'username avatar profilePicture'
                            },
                            {
                                path: 'replyId',
                                select: 'authorId',
                                populate: {
                                    path: 'authorId',
                                    select: 'username'
                                }
                            }
                        ]
                    }
                ]
            })
            .lean();

        // Transform replyId fields to include author username
        posts.forEach(post => {
            post.commentIds?.forEach((comment: any) => {
                comment.replyIds?.forEach((reply: any) => {
                    if (reply.replyId) {
                        reply.replyId = {
                            _id: reply.replyId._id,
                            authorUsername: reply.replyId.authorId.username
                        };
                        delete reply.replyId.authorId;
                    }
                });
            });
        });

        // Get comment counts for all posts in one query
        const postIds = posts.map(post => post._id);
        const [commentCounts, replyCounts] = await Promise.all([
            CommentModel.aggregate([
                { $match: { postId: { $in: postIds } } },
                { $group: { _id: '$postId', count: { $sum: 1 } } }
            ]),
            ReplyModel.aggregate([
                { $match: { postId: { $in: postIds } } },
                { $group: { _id: '$commentId', count: { $sum: 1 } } }
            ])
        ]);

        // Create maps for counts
        const commentCountMap = new Map();
        commentCounts.forEach(item => {
            commentCountMap.set(item._id.toString(), item.count);
        });

        const replyCountMap = new Map();
        replyCounts.forEach(item => {
            replyCountMap.set(item._id.toString(), item.count);
        });

        // Enhance posts with counts
        const enhancedPosts = posts.map(post => {
            // Enhance each comment with its reply count
            const enhancedComments = post.commentIds?.map(comment => ({
                ...comment,
                replyCount: replyCountMap.get(comment._id.toString()) || 0
            })) || [];

            return {
                ...post,
                commentIds: enhancedComments,
                commentCount: commentCountMap.get(post._id.toString()) || 0
            };
        });

        res.status(200).json({
            success: true,
            data: enhancedPosts,
            pagination: {
                currentPage: pageNumber,
                totalPages: Math.ceil(totalPosts / limitNumber),
                totalPosts,
                postsPerPage: limitNumber
            }
        });

    } catch (error) {
        console.error('Error fetching forum posts:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

export const getForumPostById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Validate post ID format
        if (!mongoose.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: 'Invalid post ID format'
            });
            return;
        }

        // Get the post with populated data
        const post = await ForumPostModel.findById(id)
            .populate({
                path: 'authorId',
                select: 'username avatar profilePicture'
            })
            .populate({
                path: 'commentIds',
                options: { sort: { createdAt: 1 } }, // Sort comments newest first
                populate: [
                    {
                        path: 'authorId',
                        select: 'username avatar profilePicture'
                    },
                    {
                        path: 'replyIds',
                        options: { sort: { createdAt: 1 } }, // Sort replies newest first
                        populate: [
                            {
                                path: 'authorId',
                                select: 'username avatar profilePicture'
                            },
                            {
                                path: 'replyId',
                                select: 'authorId',
                                populate: {
                                    path: 'authorId',
                                    select: 'username'
                                }
                            }
                        ]
                    }
                ]
            })
            .lean();

        if (!post) {
            res.status(404).json({
                success: false,
                message: 'Post not found'
            });
            return;
        }

        // Transform the replyId field to include both id and author's username
        post.commentIds?.forEach((comment: any) => {
            comment.replyIds?.forEach((reply: any) => {
                if (reply.replyId) {
                    reply.replyId = {
                        _id: reply.replyId._id,
                        authorUsername: reply.replyId.authorId.username
                    };
                    // Remove the authorId field as we've extracted the username
                    delete reply.replyId.authorId;
                }
            });
        });

        // Get comment count
        const commentCount = await CommentModel.countDocuments({ postId: id });

        // Transform the response to match your existing pattern
        const responseData = {
            ...post,
            commentCount
        };

        res.status(200).json({
            success: true,
            data: responseData
        });

    } catch (error) {
        console.error('Error fetching forum post:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

const handleUpdateUpload: RequestHandler = (req, res, next) => {
    upload(req, res, (err) => {
        if (err) {
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    res.status(400).json({
                        success: false,
                        message: 'File size too large. Max 5MB per file.'
                    })
                    return
                }
                if (err.code === 'LIMIT_FILE_COUNT') {
                    res.status(400).json({
                        success: false,
                        message: 'Too many files. Maximum 10 allowed.'
                    })
                    return
                }
            } else if (err.message === 'Only image files are allowed!') {
                res.status(400).json({
                    success: false,
                    message: err.message
                })
                return
            }
            res.status(500).json({
                success: false,
                message: 'File upload failed',
                error: err.message
            })
            return
        }
        next()
    })
}

export const updateForumPostHandler: RequestHandler = async (req, res) => {
    try {
        const user = req.user as IUser;
        const { postId } = req.params;
        const { title, text, pinned } = req.body;

        console.log(postId)
        console.log(req.body)
        console.log(req.files)

        // Authentication check
        if (!user) {
            res.status(401).json({
                success: false,
                message: "Неавторизованный пользователь"
            });
            return;
        }

        // Validation
        if (!title?.trim() || !text?.trim()) {
            res.status(400).json({
                success: false,
                message: "Заголовок и текст обязательны"
            });
            return;
        }

        // Check if user is trying to pin post without admin privileges
        if (pinned && !user?.admin) {
            res.status(403).json({
                success: false,
                message: "Only admins can pin posts"
            });
            return;
        }

        // Get the existing post
        const forumPost = await ForumPostModel.findById(postId);
        if (!forumPost) {
            res.status(404).json({ message: "Forum post not found" });
            return;
        }

        // Check if user is the author or admin
        if (forumPost.authorId.toString() !== user._id.toString() && !user.admin) {
            res.status(403).json({
                success: false,
                message: "Вы можете редактировать только свои посты"
            });
            return;
        }

        // Process all attachments - this will completely replace the old ones
        const uploadedAttachments = (req.files as Express.Multer.File[] || []).map(file =>
            path.join('media', file.filename)
        );

        // Step 2: Existing (text) attachments sent from the frontend
        let textAttachments: string[] = [];
        if (req.body.attachments) {
            textAttachments = Array.isArray(req.body.attachments)
                ? req.body.attachments
                : [req.body.attachments]; // if it's just one string, not an array
        }

        // Final attachment list (frontend gives full set)
        const attachments = [...textAttachments, ...uploadedAttachments];

        // Handle text attachments (existing ones that were kept)
        // The frontend sends all attachments (both existing and new) in the FormData
        // For existing ones, it sends the path as a string
        // if (req.body.attachments) {
        //     const textAttachments = Array.isArray(req.body.attachments)
        //         ? req.body.attachments
        //         : [req.body.attachments];

        //     textAttachments.forEach(path => {
        //         if (typeof path === 'string' && !attachments.includes(path)) {
        //             attachments.push(path);
        //         }
        //     });
        // }

        // Update the post with completely new data
        const updatedPost = await ForumPostModel.findByIdAndUpdate(
            postId,
            {
                title,
                text,
                attachments,
                pinned: pinned || false,
                updatedAt: new Date()
            },
            { new: true }
        );

        res.status(200).json({
            success: true,
            message: "Тема успешно обновлена",
            data: updatedPost
        });
    } catch (error: any) {
        console.error("Ошибка при обновлении темы:", error);
        res.status(500).json({
            success: false,
            message: "Внутренняя ошибка сервера",
            error: error.message
        });
    }
};

export const updateForumPost = [checkAuth, handleUpdateUpload, updateForumPostHandler] as [
    RequestHandler,
    RequestHandler,
    RequestHandler
];

export const deleteForumPost = async (req: Request, res: Response) => {
    try {
        // Check if user is authenticated
        if (!req.user) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const user = req.user as IUser;
        const postId = req.params.id;

        // Find the forum post
        const forumPost = await ForumPostModel.findById(postId);
        if (!forumPost) {
            res.status(404).json({ message: "Forum post not found" });
            return;
        }

        // Check if user is admin or the author
        if (!user.admin && !user._id.equals(forumPost.authorId)) {
            res.status(403).json({ message: "Forbidden: You don't have permission to delete this post" });
            return;
        }

        // Delete all comments associated with the post
        const comments = await CommentModel.find({ postId: forumPost._id });
        const commentIds = comments.map(comment => comment._id);

        // Delete all replies associated with the comments
        await ReplyModel.deleteMany({ commentId: { $in: commentIds } });

        // Delete all comments
        await CommentModel.deleteMany({ postId: forumPost._id });

        // Finally delete the post
        await ForumPostModel.findByIdAndDelete(postId);

        res.status(200).json({ message: "Forum post and associated comments/replies deleted successfully" });
        return;
    } catch (error) {
        console.error("Error deleting forum post:", error);
        res.status(500).json({ message: "Internal server error" });
        return;
    }
};

export const addComment = async (req: Request, res: Response) => {
    try {
        const { postId } = req.params;
        const { text } = req.body;

        if (!req.user) {
            res.status(401).json({ message: 'Unauthorized' });
            return
        }

        const post = await ForumPostModel.findById(postId);
        if (!post) {
            res.status(404).json({ message: 'Post not found' });
            return
        }

        if (!text) {
            res.status(400).json({ message: "Введите текст комментария" });
            return
        }

        const user = req.user as IUser;
        const newComment = new CommentModel({
            postId,
            authorId: user._id,
            text
        });

        await newComment.save();

        post.commentIds.push(newComment._id as Types.ObjectId);
        await post.save();

        // Only proceed with notification if commenter isn't post owner
        if (!post.authorId.equals(user._id)) {
            await new NotificationModel({
                recipientId: post.authorId,
                senderId: user._id,
                type: "commentOnPost",
                postId: post._id,
                commentId: newComment._id,
                createdAt: new Date(),
                updatedAt: new Date()
            }).save();

            // Get fresh unread count
            const unreadCount = await NotificationModel.countDocuments({
                recipientId: post.authorId,
                read: false
            });

            // Safely emit count update
            try {
                (req as any).io?.to(post.authorId.toString()).emit('notification_count', {
                    count: unreadCount
                });
            } catch (wsError) {
                console.error('WebSocket emit failed:', wsError);
                // Continue with response even if WebSocket fails
            }
        }

        res.status(201).json(newComment);
        return

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
        return
    }
};

export const editComment = async (req: Request, res: Response) => {
    try {
        const { postId, commentId } = req.params;
        const { text } = req.body;

        if (!req.user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        if (!text) {
            res.status(400).json({ message: 'Введите текст' })
            return
        }

        const comment = await CommentModel.findOne({
            _id: commentId,
            postId
        });

        if (!comment) {
            res.status(404).json({ message: 'Comment not found' });
            return;
        }

        if (comment.authorId.toString() !== (req.user as IUser)._id.toString()) {
            res.status(403).json({ message: 'You can only edit your own comments' });
            return;
        }

        comment.text = text;
        await comment.save();

        res.status(200).json(comment);
        return;
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
        return;
    }
};

export const deleteComment = async (req: Request, res: Response) => {
    try {
        const { postId, commentId } = req.params;

        if (!req.user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        const comment = await CommentModel.findOne({
            _id: commentId,
            postId
        });

        if (!comment) {
            res.status(404).json({ message: 'Comment not found' });
            return;
        }

        if (comment.authorId.toString() !== (req.user as IUser)._id.toString() && !((req.user as IUser).admin)) {
            res.status(403).json({ message: 'You can only delete your own comments' });
            return;
        }

        await comment.deleteOne();
        await ForumPostModel.findByIdAndUpdate(postId, {
            $pull: { commentIds: commentId }
        });
        await ReplyModel.deleteMany({ commentId });

        res.status(200).json({ message: 'Comment deleted successfully' });
        return;
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
        return;
    }
};

export const addReply = async (req: Request, res: Response) => {
    try {
        const { postId, commentId } = req.params;
        const { text, replyId } = req.body;
        const author = req.user as IUser;
        const authorId = author?._id;

        // Validate required fields
        if (!text || !text.trim()) {
            res.status(400).json({
                success: false,
                message: 'Reply text is required'
            });
            return
        }

        // Validate ObjectId formats
        if (!mongoose.Types.ObjectId.isValid(postId) ||
            !mongoose.Types.ObjectId.isValid(commentId) ||
            (replyId && !mongoose.Types.ObjectId.isValid(replyId))) {
            res.status(400).json({
                success: false,
                message: 'Invalid ID format'
            });
            return
        }

        // Check if parent comment exists and belongs to this post
        const parentComment = await CommentModel.findOne({
            _id: commentId,
            postId: postId
        });

        if (!parentComment) {
            res.status(404).json({
                success: false,
                message: 'Comment not found or does not belong to this post'
            });
            return
        }

        let parentReply: any;

        // If this is a reply to another reply, validate that too
        if (replyId) {
            parentReply = await ReplyModel.findOne({
                _id: replyId,
                commentId: commentId,
                postId: postId
            });

            if (!parentReply) {
                res.status(404).json({
                    success: false,
                    message: 'Parent reply not found or does not belong to this comment'
                });
                return
            }
        }

        // Create the reply
        const newReply = await ReplyModel.create({
            authorId,
            text,
            commentId,
            postId,
            replyId: replyId || null,
            createdAt: new Date()
        });

        // Add reply to comment's replyIds array
        await CommentModel.findByIdAndUpdate(
            commentId,
            { $push: { replyIds: newReply._id } }
        );

        let recipientId: mongoose.Types.ObjectId;
        let notificationType: "replyToComment" | "replyToReply";

        if (replyId) {
            recipientId = parentReply.authorId;
            notificationType = "replyToReply";
        } else {
            recipientId = parentComment.authorId;
            notificationType = "replyToComment";
        }

        // Send response first
        const populatedReply = await ReplyModel.findById(newReply._id)
            .populate({
                path: 'authorId',
                select: 'username avatar profilePicture'
            })
            .populate({
                path: 'replyId',
                populate: {
                    path: 'authorId',
                    select: 'username avatar profilePicture'
                }
            })
            .lean();

        res.status(201).json({
            success: true,
            data: populatedReply
        });

        // Then handle notification count update (non-blocking)
        if (!authorId.equals(recipientId)) {
            const notificationData: any = {
                recipientId: recipientId,
                senderId: authorId,
                type: notificationType,
                postId: postId,
                commentId: commentId,
                replyId: newReply._id,
                read: false,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            if (replyId) {
                notificationData.parentReplyId = parentReply._id;
            }

            const notification = new NotificationModel(notificationData);
            await notification.save();

            try {
                const unreadCount = await NotificationModel.countDocuments({
                    recipientId: recipientId,
                    read: false
                });

                (req as any).io?.to(recipientId.toString()).emit('notification_count', {
                    count: unreadCount
                });
            } catch (wsError) {
                console.error('WebSocket emit failed:', wsError);
            }
        }

    } catch (error) {
        console.error('Error adding reply:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

export const editReply = async (req: Request, res: Response) => {
    try {
        const { postId, commentId, replyId } = req.params;
        const { text } = req.body;
        const authorId = (req.user as IUser)?._id;

        // Validate required fields
        if (!text || !text.trim()) {
            res.status(400).json({
                success: false,
                message: 'Reply text is required'
            });
            return
        }

        // Validate ObjectId formats
        if (!mongoose.Types.ObjectId.isValid(postId) ||
            !mongoose.Types.ObjectId.isValid(commentId) ||
            !mongoose.Types.ObjectId.isValid(replyId)) {
            res.status(400).json({
                success: false,
                message: 'Invalid ID format'
            });
            return
        }

        // Find and update the reply
        const updatedReply = await ReplyModel.findOneAndUpdate(
            {
                _id: replyId,
                commentId,
                postId,
                authorId // Ensure only author can edit
            },
            { text, updatedAt: new Date() },
            { new: true, runValidators: true }
        )
            .populate({
                path: 'authorId',
                select: 'username avatar profilePicture'
            })
            .populate({
                path: 'replyId',
                populate: {
                    path: 'authorId',
                    select: 'username avatar profilePicture'
                }
            })
            .lean();

        if (!updatedReply) {
            res.status(404).json({
                success: false,
                message: 'Reply not found or you are not authorized to edit it'
            });
            return
        }

        res.status(200).json({
            success: true,
            data: updatedReply
        });
        return

    } catch (error) {
        console.error('Error editing reply:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        return
    }
};

export const deleteReply = async (req: Request, res: Response) => {
    try {
        const { postId, commentId, replyId } = req.params;
        if (!req.user) {
            res.status(401).json({ message: "Unauthorized" })
            return
        }
        const user = req.user as IUser;
        const authorId = user._id;

        // Validate ObjectId formats
        if (!mongoose.Types.ObjectId.isValid(postId) ||
            !mongoose.Types.ObjectId.isValid(commentId) ||
            !mongoose.Types.ObjectId.isValid(replyId)) {
            res.status(400).json({
                success: false,
                message: 'Invalid ID format'
            });
            return
        }

        // Build the query condition
        const queryConditions: any = {
            _id: replyId,
            commentId,
            postId
        };

        // If not admin, restrict to author's replies only
        if (!user.admin) {
            queryConditions.authorId = authorId;
        }

        // Find and delete the reply
        const deletedReply = await ReplyModel.findOneAndDelete(queryConditions);

        if (!deletedReply) {
            res.status(404).json({
                success: false,
                message: 'Reply not found or you are not authorized to delete it'
            });
            return
        }

        // Remove reply from comment's replyIds array
        await CommentModel.findByIdAndUpdate(
            commentId,
            { $pull: { replyIds: replyId } }
        );

        res.status(200).json({
            success: true,
            message: 'Reply deleted successfully'
        });
        return

    } catch (error) {
        console.error('Error deleting reply:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        return
    }
};