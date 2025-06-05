import { Router } from "express"
import { getStatus, loginUser, logoutUser, registerUser } from "../handlers/auth"
import { validateRegistration } from "../utils/validateRegistration"

const router = Router()

router.post('/api/auth/register', validateRegistration, registerUser)
router.post("/api/auth/login", loginUser)
router.post("/api/auth/logout", logoutUser)

router.get("/api/auth/status", getStatus) 

export default router