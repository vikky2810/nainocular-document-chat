import type { ErrorRequestHandler, RequestHandler } from 'express'
import multer from 'multer'
import OpenAI from 'openai'
import { z } from 'zod'
import { env } from '../config/env.js'
import { aiErrorMessage } from '../services/aiErrors.js'

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

export const notFound: RequestHandler = (req, _res, next) => {
  next(new HttpError(404, `No route for ${req.method} ${req.originalUrl}`))
}

// Turns every error into `{ error: string }`, which the client shows as-is
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message })
    return
  }
  if (err instanceof z.ZodError) {
    res.status(400).json({ error: err.issues.map((i) => i.message).join('; ') })
    return
  }
  if (err instanceof multer.MulterError) {
    const tooLarge = err.code === 'LIMIT_FILE_SIZE'
    res
      .status(tooLarge ? 413 : 400)
      .json({ error: tooLarge ? `File is larger than ${env.MAX_FILE_SIZE_MB} MB.` : err.message })
    return
  }
  if (err instanceof OpenAI.APIError) {
    console.error('AI provider error:', err.status, err.message)
    res.status(err.status === 429 ? 429 : 502).json({ error: aiErrorMessage(err, 'try again') })
    return
  }
  if (err?.type === 'entity.parse.failed') {
    res.status(400).json({ error: 'Request body is not valid JSON.' })
    return
  }

  console.error(err)
  res.status(500).json({ error: 'Something went wrong on the server.' })
}
