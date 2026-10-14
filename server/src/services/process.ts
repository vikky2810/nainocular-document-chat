import type { Types } from 'mongoose'
import OpenAI from 'openai'
import { env } from '../config/env.js'
import { Chunk } from '../models/Chunk.js'
import { DocumentModel } from '../models/Document.js'
import { aiErrorMessage } from './aiErrors.js'
import { chunkPages } from './chunk.js'
import { embedTexts } from './embed.js'
import { extractPages } from './extract.js'
import { ensureVectorIndex } from './retrieve.js'

// Runs after the upload response is sent: extract → chunk → embed → store.
// Never throws; failures are saved on the document so the client can show them.
export async function processDocument(id: Types.ObjectId, name: string, kind: 'pdf' | 'txt', buffer: Buffer) {
  try {
    const pages = await extractPages(buffer, kind)
    const chunks = chunkPages(pages, env.CHUNK_SIZE, env.CHUNK_OVERLAP)
    if (!chunks.length) {
      throw new Error('No extractable text found. Scanned or image-only PDFs are not supported.')
    }

    const embeddings = await embedTexts(chunks.map((c) => c.text))
    await ensureVectorIndex(embeddings[0].length)
    await Chunk.insertMany(
      chunks.map((c, i) => ({ ...c, documentId: id, documentName: name, embedding: embeddings[i] })),
    )

    const { matchedCount } = await DocumentModel.updateOne(
      { _id: id },
      { status: 'ready', pageCount: kind === 'pdf' ? pages.length : undefined, chunkCount: chunks.length },
    )
    // The document was deleted while it was processing: drop the chunks we just stored
    if (matchedCount === 0) await Chunk.deleteMany({ documentId: id })
  } catch (err) {
    const message =
      err instanceof OpenAI.APIError
        ? aiErrorMessage(err, 'upload the file again')
        : err instanceof Error
          ? err.message
          : 'Unknown processing error'
    console.error(`Processing failed for "${name}":`, err instanceof Error ? err.message : err)
    await Chunk.deleteMany({ documentId: id }).catch(() => {})
    await DocumentModel.updateOne({ _id: id }, { status: 'failed', error: message }).catch(() => {})
  }
}

// Documents left "processing" by a crash or restart will never finish, so mark them failed
export async function failInterruptedDocuments() {
  await DocumentModel.updateMany(
    { status: 'processing' },
    { status: 'failed', error: 'Processing was interrupted by a server restart. Please upload again.' },
  )
}
