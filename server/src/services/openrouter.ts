import OpenAI from 'openai'
import { env } from '../config/env.js'

// OpenRouter is OpenAI-compatible, so the official SDK works with a different base URL
export const openrouter = new OpenAI({
  apiKey: env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: { 'X-Title': 'Nainocular Document Chat' },
})
