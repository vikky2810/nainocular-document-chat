import { useCallback, useEffect, useState } from 'react'
import { askQuestion, getConversationMessages, listConversations } from '../api'
import type { ChatMessage, ConversationSummary } from '../types'

// Remembers the open conversation so a page reload doesn't lose the chat
const STORAGE_KEY = 'nainocular.conversationId'

export function useChat() {
  const [conversationId, setConversationId] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY))
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [loading, setLoading] = useState(false)

  const refreshConversations = useCallback(() => {
    listConversations()
      .then(setConversations)
      .catch(() => {})
  }, [])

  const selectConversation = useCallback((id: string | null) => {
    setConversationId(id)
    if (id) localStorage.setItem(STORAGE_KEY, id)
    else localStorage.removeItem(STORAGE_KEY)
  }, [])

  const openConversation = useCallback(
    async (id: string) => {
      selectConversation(id)
      try {
        setMessages(await getConversationMessages(id))
      } catch {
        // The conversation was deleted or the server is down: start fresh
        selectConversation(null)
        setMessages([])
      }
    },
    [selectConversation],
  )

  // Restore the conversation that was open before the reload
  useEffect(() => {
    refreshConversations()
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return
    getConversationMessages(saved)
      .then(setMessages)
      .catch(() => selectConversation(null))
  }, [refreshConversations, selectConversation])

  function newChat() {
    selectConversation(null)
    setMessages([])
  }

  async function send(question: string, documentIds: string[]) {
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'user', content: question }])
    setLoading(true)
    try {
      const res = await askQuestion(question, documentIds, conversationId ?? undefined)
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'assistant', content: res.answer, sources: res.sources },
      ])
      if (res.conversationId !== conversationId) {
        selectConversation(res.conversationId)
        refreshConversations()
      }
    } catch (err) {
      const content = err instanceof Error ? err.message : 'Something went wrong.'
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'assistant', content, isError: true }])
    } finally {
      setLoading(false)
    }
  }

  return { conversationId, conversations, messages, loading, send, newChat, openConversation }
}
