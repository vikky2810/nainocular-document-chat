import type { RequestHandler } from 'express'
import multer from 'multer'
import path from 'node:path'
import { env } from '../config/env.js'
import { HttpError } from './errors.js'

// octet-stream is allowed because some OSes send it for these files; the bytes are checked below
const ALLOWED = {
  '.pdf': ['application/pdf', 'application/x-pdf', 'application/octet-stream'],
  '.txt': ['text/plain', 'application/octet-stream'],
} as const

export const uploadSingle = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() as keyof typeof ALLOWED
    const mimes: readonly string[] | undefined = ALLOWED[ext]
    if (!mimes || !mimes.includes(file.mimetype)) {
      cb(new HttpError(415, 'Unsupported file type. Only PDF and TXT files are allowed.'))
      return
    }
    cb(null, true)
  },
}).single('file')

// The extension and MIME type come from the client, so also check the bytes themselves
export const validateFileContent: RequestHandler = (req, _res, next) => {
  const file = req.file
  if (!file) throw new HttpError(400, 'No file uploaded. Send it in the "file" form field.')
  if (file.size === 0) throw new HttpError(400, 'The file is empty.')

  // Multer reads filenames as latin1; re-decode so non-English names survive
  file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8')

  if (fileKind(file.originalname) === 'pdf') {
    if (file.buffer.subarray(0, 5).toString('ascii') !== '%PDF-') {
      throw new HttpError(415, 'This file is not a valid PDF.')
    }
  } else {
    try {
      new TextDecoder('utf-8', { fatal: true }).decode(file.buffer)
    } catch {
      throw new HttpError(415, 'This TXT file is not valid UTF-8 text.')
    }
    if (file.buffer.includes(0)) throw new HttpError(415, 'This TXT file contains binary data.')
    if (!file.buffer.toString('utf8').trim()) throw new HttpError(400, 'The file is empty.')
  }
  next()
}

export function fileKind(filename: string): 'pdf' | 'txt' {
  return path.extname(filename).toLowerCase() === '.pdf' ? 'pdf' : 'txt'
}
