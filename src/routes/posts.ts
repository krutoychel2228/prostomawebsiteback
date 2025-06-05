import { Router } from "express"
import { validatePost } from "../utils/validatePost"
import { createPost, deletePost, getPostById, getPosts, updatePost } from "../handlers/posts"
import { validatePostUpdate } from "../utils/validatePostUpdate"

const router = Router()

router.post('/api/posts/', createPost[0], validatePost, createPost[1])
router.get('/api/posts', getPosts)
router.get('/api/posts/:id', getPostById)
router.delete('/api/posts/:id', deletePost)
router.patch('/api/posts/:id', validatePostUpdate, updatePost)

export default router