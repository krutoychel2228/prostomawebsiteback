import { Router } from "express"
import { createVideo, updateVideo, getVideoById, getVideos, deleteVideo } from "../handlers/videos"

const router = Router()

router.post('/api/videos/', createVideo)
router.get('/api/videos', getVideos)
router.get('/api/videos/:id', getVideoById)
router.delete('/api/videos/:id', deleteVideo)
router.patch('/api/videos/:id', updateVideo)

export default router