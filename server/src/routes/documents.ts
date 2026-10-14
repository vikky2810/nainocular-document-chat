import { Router } from 'express'
import { HttpError } from '../middleware/errors.js'
import { fileKind, uploadSingle, validateFileContent } from '../middleware/upload.js'
import { idParams } from '../middleware/validate.js'
import { Chunk } from '../models/Chunk.js'
import { DocumentModel } from '../models/Document.js'
import { processDocument } from '../services/process.js'
import { deleteFile, saveFile, storedFilePath } from '../services/storage.js'

export const documentsRouter = Router()

documentsRouter.post('/', uploadSingle, validateFileContent, async (req, res) => {
  const file = req.file!
  const kind = fileKind(file.originalname)
  const doc = await DocumentModel.create({ name: file.originalname, kind, size: file.size })

  try {
    // Kept on disk so the viewer can show the original file after a reload
    await saveFile(doc.id, kind, file.buffer)
  } catch (err) {
    await doc.deleteOne()
    throw err
  }

  // Respond straight away; the client polls GET /:id until status is ready or failed
  void processDocument(doc._id, doc.name, kind, file.buffer)
  res.status(202).json(doc)
})

documentsRouter.get('/', async (_req, res) => {
  res.json(await DocumentModel.find().sort({ createdAt: 1 }))
})

documentsRouter.get('/:id', async (req, res) => {
  const { id } = idParams.parse(req.params)
  const doc = await DocumentModel.findById(id)
  if (!doc) throw new HttpError(404, 'Document not found.')
  res.json(doc)
})

// The optional trailing filename is ignored here; it only exists so the browser's
// PDF viewer shows the real name in its toolbar instead of "file"
documentsRouter.get('/:id/file{/:filename}', async (req, res) => {
  const { id } = idParams.parse({ id: req.params.id })
  const doc = await DocumentModel.findById(id)
  if (!doc) throw new HttpError(404, 'Document not found.')

  // Helmet's CSP sandboxes the response, which stops the browser's built-in PDF viewer
  res.removeHeader('Content-Security-Policy')
  res.type(doc.kind === 'pdf' ? 'application/pdf' : 'text/plain; charset=utf-8')
  res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(doc.name)}`)
  res.sendFile(storedFilePath(doc.id, doc.kind), (err) => {
    if (err && !res.headersSent) res.status(404).json({ error: 'The original file is no longer available.' })
  })
})

documentsRouter.delete('/:id', async (req, res) => {
  const { id } = idParams.parse(req.params)
  const doc = await DocumentModel.findByIdAndDelete(id)
  if (!doc) throw new HttpError(404, 'Document not found.')
  await Chunk.deleteMany({ documentId: doc._id })
  await deleteFile(doc.id, doc.kind)
  res.status(204).end()
})
