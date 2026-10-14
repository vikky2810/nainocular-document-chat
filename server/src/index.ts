import cors from 'cors'
import express from 'express'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import mongoose from 'mongoose'
import { connectDb } from './config/db.js'
import { env } from './config/env.js'
import { errorHandler, notFound } from './middleware/errors.js'
import { chatRouter } from './routes/chat.js'
import { conversationsRouter } from './routes/conversations.js'
import { documentsRouter } from './routes/documents.js'
import { failInterruptedDocuments } from './services/process.js'
import { dropVectorIndexIfEmpty } from './services/retrieve.js'

const app = express()

app.use(helmet())
app.use(cors({ origin: env.CLIENT_ORIGIN }))
app.use(express.json({ limit: '100kb' }))

// Uploads and chat call paid AI APIs, so cap how often one client can hit them
const aiLimiter = rateLimit({
  windowMs: 60_000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many requests. Please wait a minute and try again.' },
})

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' })
})
app.use('/api/documents', (req, res, next) => (req.method === 'POST' ? aiLimiter(req, res, next) : next()))
app.use('/api/documents', documentsRouter)
app.use('/api/chat', aiLimiter, chatRouter)
app.use('/api/conversations', conversationsRouter)

app.use(notFound)
app.use(errorHandler)

await connectDb()
await failInterruptedDocuments()
await dropVectorIndexIfEmpty()

app.listen(env.PORT, () => {
  console.log(`Server listening on http://localhost:${env.PORT} (vector search: ${env.VECTOR_SEARCH})`)
})
