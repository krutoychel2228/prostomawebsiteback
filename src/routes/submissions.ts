import { Router } from "express"
import { getSubmissions, submitAppointmentRequest, submitQuestion, switchSubmissionStatus } from "../handlers/submissions"

const router = Router()

router.post('/api/submissions/question', submitQuestion)
router.post('/api/submissions/appointment', submitAppointmentRequest)
router.get('/api/submissions', getSubmissions)
router.put('/api/submissions/:id', switchSubmissionStatus)

export default router