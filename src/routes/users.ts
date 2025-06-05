import { Router } from "express"
import { deleteUser, getUser, updateUser, getMyProfile, changePassword, forgotPassword, resetPassword } from "../handlers/users"

const router = Router()

router.patch('/api/user/', updateUser)
router.get('/api/user/me/', getMyProfile)
router.get('/api/user/:id', getUser)
router.delete('/api/user/', deleteUser)
router.patch('/api/user/change-password/', changePassword)
router.post('/api/user/forgot-password/', forgotPassword)
router.post('/api/user/reset-password/', resetPassword)

export default router