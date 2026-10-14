import { env } from '../config/env.js'
import { openrouter } from './openrouter.js'

const BATCH_SIZE = 64

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const vectors: number[][] = []
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const res = await openrouter.embeddings.create({
      model: env.EMBEDDING_MODEL,
      input: texts.slice(i, i + BATCH_SIZE),
    })
    const batch = [...res.data].sort((a, b) => a.index - b.index).map((d) => d.embedding)
    if (batch.length !== Math.min(BATCH_SIZE, texts.length - i)) {
      throw new Error('Embedding provider returned an unexpected number of vectors')
    }
    vectors.push(...batch)
  }

  const expected = env.EMBEDDING_DIMENSIONS ?? vectors[0]?.length
  const wrongSize = vectors.find((v) => v.length !== expected)
  if (wrongSize) {
    throw new Error(`Embedding has ${wrongSize.length} dimensions but ${expected} were expected`)
  }
  return vectors
}

export async function embedQuery(text: string): Promise<number[]> {
  const [vector] = await embedTexts([text])
  return vector
}
