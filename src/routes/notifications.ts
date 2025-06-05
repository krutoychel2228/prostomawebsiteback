import { Router } from "express"
import { getNotifications, readNotification } from "../handlers/notifications"

const router = Router()

router.get('/api/notifications/', getNotifications)
router.put('/api/notifications/:id',  readNotification)

export default router