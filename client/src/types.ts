export type DocumentKind = 'pdf' | 'txt'

// "uploading" only exists in the browser, before the server has answered
export type DocumentStatus = 'uploading' | 'processing' | 'ready' | 'failed'

export interface UploadedDocument {
  id: string
  name: string
  kind: DocumentKind
  size: number
  status: DocumentStatus
  error?: string
  pageCount?: number
  chunkCount?: number
}

export interface Source {
  documentId: string
  documentName: string
  excerpt: string
  page?: number
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: Source[]
  isError?: boolean
}

export interface ConversationSummary {
  id: string
  title: string
  updatedAt: string
}
