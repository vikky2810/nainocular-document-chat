import { Router } from 'express'
import { HttpError } from '../middleware/errors.js'
import { idParams } from '../middleware/validate.js'
import { Conversation } from '../models/Conversation.js'
import { Message } from '../models/Message.js'

export const conversationsRouter = Router()

conversationsRouter.get('/', async (_req, res) => {
  res.json(await Conversation.find().sort({ updatedAt: -1 }).limit(50))
})

conversationsRouter.get('/:id', async (req, res) => {
  const { id } = idParams.parse(req.params)
  const conversation = await Conversation.findById(id).populate('documentIds', 'name kind status')
  if (!conversation) throw new HttpError(404, 'Conversation not found.')
  const messages = await Message.find({ conversationId: conversation._id }).sort({ createdAt: 1 })
  res.json({ conversation, messages })
})
