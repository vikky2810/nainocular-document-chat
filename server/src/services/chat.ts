import { Types } from 'mongoose'
import { HttpError } from '../middleware/errors.js'
import { Conversation } from '../models/Conversation.js'
import { DocumentModel } from '../models/Document.js'
import { Message } from '../models/Message.js'
import { embedQuery } from './embed.js'
import { FALLBACK_ANSWER, generateAnswer } from './llm.js'
import { retrieveChunks, type RetrievedChunk } from './retrieve.js'

const EXCERPT_LENGTH = 300

interface AskInput {
  question: string
  documentIds: string[]
  conversationId?: string
}

export async function ask({ question, documentIds, conversationId }: AskInput) {
  const ids = [...new Set(documentIds)].map((id) => new Types.ObjectId(id))
  const docs = await DocumentModel.find({ _id: { $in: ids } })
  if (docs.length !== ids.length) throw new HttpError(404, 'One or more documents no longer exist.')

  const processing = docs.filter((d) => d.status === 'processing')
  if (processing.length) {
    throw new HttpError(409, `Still processing: ${processing.map((d) => d.name).join(', ')}. Try again shortly.`)
  }
  const readyIds = docs.filter((d) => d.status === 'ready').map((d) => d._id)
  if (!readyIds.length) throw new HttpError(400, 'None of the selected documents were processed successfully.')

  const conversation = conversationId
    ? await Conversation.findByIdAndUpdate(
        conversationId,
        { $addToSet: { documentIds: { $each: readyIds } } },
        { new: true },
      )
    : await Conversation.create({ title: question.slice(0, 80), documentIds: readyIds })
  if (!conversation) throw new HttpError(404, 'Conversation not found.')

  const chunks = await retrieveChunks(await embedQuery(question), readyIds)

  // Nothing relevant enough was retrieved: answer with the fallback without calling the LLM
  let answer = FALLBACK_ANSWER
  let used: RetrievedChunk[] = []
  if (chunks.length) {
    const result = await generateAnswer(question, chunks)
    answer = result.text
    if (!result.isFallback) used = result.cited.length ? result.cited.map((i) => chunks[i]) : chunks
  }

  // Sources come from the retrieved chunks, never from the model's text
  const sources = used.map((c) => ({
    documentId: c.documentId,
    documentName: c.documentName,
    page: c.page,
    excerpt: excerpt(c.text),
    similarity: Number(c.similarity.toFixed(3)),
  }))

  await Message.insertMany([
    { conversationId: conversation._id, role: 'user', content: question },
    { conversationId: conversation._id, role: 'assistant', content: answer, sources },
  ])
  await conversation.updateOne({ updatedAt: new Date() })

  return { answer, sources, conversationId: conversation.id as string }
}

function excerpt(text: string) {
  if (text.length <= EXCERPT_LENGTH) return text
  const cut = text.slice(0, EXCERPT_LENGTH)
  return `${cut.slice(0, cut.lastIndexOf(' ') > 0 ? cut.lastIndexOf(' ') : EXCERPT_LENGTH)}…`
}
