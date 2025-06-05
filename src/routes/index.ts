import { Router } from 'express'
import usersRouter from './users'
import authRoutes from './auth'
import postsRoutes from './posts'
import forumPostsRoutes from './forumPosts'
import notificationsRoutes from './notifications'
import submissionsRoutes from './submissions'
import videosRoutes from './videos'

const router = Router()

router.use(usersRouter)
router.use(authRoutes)
router.use(postsRoutes)
router.use(forumPostsRoutes)
router.use(notificationsRoutes)
router.use(submissionsRoutes)
router.use(videosRoutes)

export default router