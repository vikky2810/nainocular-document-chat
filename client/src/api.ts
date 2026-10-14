import type { ChatMessage, ConversationSummary, Source, UploadedDocument } from './types'

export interface ChatResponse {
  answer: string
  sources: Source[]
  conversationId: string
}

// All server errors come back as `{ error: string }`; turn them into thrown Errors
async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(url, init)
  } catch {
    throw new Error('Could not reach the server. Check that the backend is running.')
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.error ?? `Request failed (${res.status})`)
  }
  return res.status === 204 ? (undefined as T) : res.json()
}

const json = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

export const documentFileUrl = (id: string, name = '') => `/api/documents/${id}/file/${encodeURIComponent(name)}`

export function listDocuments() {
  return request<UploadedDocument[]>('/api/documents')
}

export function getDocument(id: string) {
  return request<UploadedDocument>(`/api/documents/${id}`)
}

export function uploadDocument(file: File) {
  const form = new FormData()
  form.append('file', file)
  return request<UploadedDocument>('/api/documents', { method: 'POST', body: form })
}

export function deleteDocument(id: string) {
  return request<void>(`/api/documents/${id}`, { method: 'DELETE' })
}

export function askQuestion(question: string, documentIds: string[], conversationId?: string) {
  return request<ChatResponse>('/api/chat', json({ question, documentIds, conversationId }))
}

export function listConversations() {
  return request<ConversationSummary[]>('/api/conversations')
}

export async function getConversationMessages(id: string): Promise<ChatMessage[]> {
  const { messages } = await request<{ messages: ChatMessage[] }>(`/api/conversations/${id}`)
  return messages
}
