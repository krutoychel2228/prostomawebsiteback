import { Router } from "express"
import { addComment, addReply, createForumPost, deleteComment, deleteForumPost, deleteReply, editComment, editReply, getForumPostById, getForumPosts, updateForumPost, updateForumPostHandler } from "../handlers/forumPosts"

const router = Router()

router.get('/api/forum/', getForumPosts)
router.get('/api/forum/:id', getForumPostById)
router.post('/api/forum/', createForumPost)
router.patch('/api/forum/:postId', updateForumPost)
router.delete('/api/forum/:id', deleteForumPost)
router.post('/api/forum/:postId/comment', addComment)
router.patch('/api/forum/:postId/comment/:commentId', editComment)
router.delete('/api/forum/:postId/comment/:commentId', deleteComment)
router.post('/api/forum/:postId/comment/:commentId/reply', addReply);
router.delete('/api/forum/:postId/comment/:commentId/reply/:replyId', deleteReply);
router.patch('/api/forum/:postId/comment/:commentId/reply/:replyId', editReply);

export default router