import { Router } from 'express'
import { z } from 'zod'
import { objectId } from '../middleware/validate.js'
import { ask } from '../services/chat.js'

const askBody = z.object({
  question: z.string().trim().min(1, 'Question is required').max(2000, 'Question is too long (max 2000 characters)'),
  documentIds: z.array(objectId).min(1, 'Select at least one document').max(50),
  conversationId: objectId.optional(),
})

export const chatRouter = Router()

chatRouter.post('/', async (req, res) => {
  res.json(await ask(askBody.parse(req.body)))
})
