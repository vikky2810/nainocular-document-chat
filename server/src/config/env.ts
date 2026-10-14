import 'dotenv/config'
import { z } from 'zod'

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(5000),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),

  MONGODB_URI: z.string().default('mongodb://localhost:27017/nainocular?directConnection=true'),
  VECTOR_SEARCH: z.enum(['mongodb', 'memory']).default('mongodb'),

  OPENROUTER_API_KEY: z.string().min(1, 'OPENROUTER_API_KEY is required (see .env.example)'),
  // Free OpenRouter models by default, so the app runs on an account with no credits
  LLM_MODEL: z.string().default('nvidia/nemotron-3-super-120b-a12b:free'),
  // Tried in order by OpenRouter when LLM_MODEL is rate-limited or down (comma-separated)
  LLM_FALLBACK_MODELS: z
    .string()
    .default('nvidia/nemotron-3-ultra-550b-a55b:free,google/gemma-4-31b-it:free')
    .transform((v) => v.split(',').map((m) => m.trim()).filter(Boolean)),
  EMBEDDING_MODEL: z.string().default('nvidia/nemotron-3-embed-1b:free'),
  // Optional: detected from the first embeddings when not set
  EMBEDDING_DIMENSIONS: z.preprocess((v) => (v === '' ? undefined : v), z.coerce.number().int().positive().optional()),

  CHUNK_SIZE: z.coerce.number().int().min(200).default(1000),
  CHUNK_OVERLAP: z.coerce.number().int().min(0).default(150),
  TOP_K: z.coerce.number().int().min(1).max(20).default(5),
  // Raw cosine similarity (-1..1). Chunks below this are treated as unrelated.
  // Tuned for nemotron-3-embed: relevant questions scored 0.17+, unrelated ones 0.12 or less.
  MIN_SIMILARITY: z.coerce.number().min(-1).max(1).default(0.15),

  MAX_FILE_SIZE_MB: z.coerce.number().positive().default(10),
})

const parsed = schema.safeParse(process.env)
if (!parsed.success) {
  console.error('Invalid environment configuration:')
  for (const issue of parsed.error.issues) console.error(`  ${issue.path.join('.')}: ${issue.message}`)
  process.exit(1)
}

export const env = parsed.data
