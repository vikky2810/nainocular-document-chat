import { Types } from 'mongoose'
import { env } from '../config/env.js'
import { Chunk, VECTOR_INDEX_NAME } from '../models/Chunk.js'

export interface RetrievedChunk {
  documentId: Types.ObjectId
  documentName: string
  page?: number
  text: string
  // Raw cosine similarity, -1..1
  similarity: number
}

export async function retrieveChunks(queryVector: number[], documentIds: Types.ObjectId[]) {
  const chunks =
    env.VECTOR_SEARCH === 'mongodb'
      ? await vectorSearch(queryVector, documentIds)
      : await memorySearch(queryVector, documentIds)
  return chunks.filter((c) => c.similarity >= env.MIN_SIMILARITY)
}

async function vectorSearch(queryVector: number[], documentIds: Types.ObjectId[]) {
  const results = await Chunk.aggregate<Omit<RetrievedChunk, 'similarity'> & { score: number }>([
    {
      $vectorSearch: {
        index: VECTOR_INDEX_NAME,
        path: 'embedding',
        queryVector,
        numCandidates: env.TOP_K * 20,
        limit: env.TOP_K,
        filter: { documentId: { $in: documentIds } },
      },
    },
    {
      $project: {
        documentId: 1,
        documentName: 1,
        page: 1,
        text: 1,
        score: { $meta: 'vectorSearchScore' },
      },
    },
  ])
  // Atlas normalises cosine scores to 0..1 as (1 + cosine) / 2; convert back
  return results.map(({ score, ...chunk }) => ({ ...chunk, similarity: score * 2 - 1 }))
}

// Fallback for a plain mongod without Atlas Search: score every chunk in Node.
// Fine for a handful of documents; use VECTOR_SEARCH=mongodb for anything larger.
async function memorySearch(queryVector: number[], documentIds: Types.ObjectId[]) {
  const chunks = await Chunk.find({ documentId: { $in: documentIds } })
    .select('+embedding')
    .lean()
  return chunks
    .map((c) => ({
      documentId: c.documentId,
      documentName: c.documentName,
      page: c.page ?? undefined,
      text: c.text,
      similarity: cosine(queryVector, c.embedding),
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, env.TOP_K)
}

function cosine(a: number[], b: number[]) {
  let dot = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) || 1)
}

let indexReady: Promise<void> | undefined

interface SearchIndexInfo {
  queryable?: boolean
  latestDefinition?: { fields?: { type: string; numDimensions?: number }[] }
}

const listVectorIndex = async () =>
  (await Chunk.collection.listSearchIndexes(VECTOR_INDEX_NAME).toArray())[0] as SearchIndexInfo | undefined

// The vector size depends on the embedding model, so the index is created on the
// first upload, once we know it. Shared promise: concurrent uploads create it once.
export function ensureVectorIndex(numDimensions: number) {
  if (env.VECTOR_SEARCH !== 'mongodb') return Promise.resolve()
  indexReady ??= createVectorIndex(numDimensions).catch((err) => {
    indexReady = undefined
    throw err
  })
  return indexReady
}

async function createVectorIndex(numDimensions: number) {
  await Chunk.createCollection()
  const existing = await listVectorIndex()
  if (existing) {
    const indexed = existing.latestDefinition?.fields?.find((f) => f.type === 'vector')?.numDimensions
    if (indexed && indexed !== numDimensions) {
      throw new Error(
        `The search index holds ${indexed}-dimension vectors but ${env.EMBEDDING_MODEL} returns ${numDimensions}. ` +
          'The embedding model was changed: delete the existing documents and restart the server.',
      )
    }
    return
  }

  await Chunk.collection.createSearchIndex({
    name: VECTOR_INDEX_NAME,
    type: 'vectorSearch',
    definition: {
      fields: [
        { type: 'vector', path: 'embedding', numDimensions, similarity: 'cosine' },
        { type: 'filter', path: 'documentId' },
      ],
    },
  })

  // The index builds in the background; wait so the first question doesn't miss it
  for (let i = 0; i < 60; i++) {
    if ((await listVectorIndex())?.queryable) break
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  console.log(`Created vector search index "${VECTOR_INDEX_NAME}" (${numDimensions} dimensions)`)
}

// When no documents are left the index can be rebuilt for a different embedding model
export async function dropVectorIndexIfEmpty() {
  if (env.VECTOR_SEARCH !== 'mongodb' || (await Chunk.estimatedDocumentCount()) > 0) return
  if (await listVectorIndex()) await Chunk.collection.dropSearchIndex(VECTOR_INDEX_NAME)
  indexReady = undefined
}
