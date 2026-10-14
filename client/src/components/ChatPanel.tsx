import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import type { ChatMessage, ConversationSummary, Source } from '../types'

interface Props {
  messages: ChatMessage[]
  loading: boolean
  // Why the input is disabled, or null when questions can be asked
  disabledReason: string | null
  conversations: ConversationSummary[]
  conversationId: string | null
  onSend: (question: string) => void
  onNewChat: () => void
  onOpenConversation: (id: string) => void
  onSourceClick: (source: Source) => void
}

export default function ChatPanel({
  messages,
  loading,
  disabledReason,
  conversations,
  conversationId,
  onSend,
  onNewChat,
  onOpenConversation,
  onSourceClick,
}: Props) {
  const disabled = disabledReason !== null
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  function submit(e: FormEvent | KeyboardEvent<HTMLTextAreaElement>) {
    e.preventDefault()
    const question = input.trim()
    if (!question || loading || disabled) return
    onSend(question)
    setInput('')
  }

  return (
    <section className="flex min-h-0 flex-col bg-slate-50 dark:bg-black">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-5">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-neutral-100">Chat</h2>
        <div className="ml-auto flex min-w-0 items-center gap-2">
          {conversations.length > 0 && (
            <select
              value={conversationId ?? ''}
              onChange={(e) => (e.target.value ? onOpenConversation(e.target.value) : onNewChat())}
              aria-label="Chat history"
              className="max-w-56 min-w-0 truncate rounded-md border border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-2 py-1.5 text-sm text-slate-700 dark:text-neutral-300"
            >
              <option value="">{conversationId ? 'New chat' : 'History…'}</option>
              {conversations.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={onNewChat}
            disabled={messages.length === 0 && !conversationId}
            className="shrink-0 rounded-md border border-slate-300 dark:border-neutral-700 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            New chat
          </button>
        </div>
      </header>

      <div className="min-h-64 flex-1 space-y-4 overflow-y-auto px-5 py-5">
        {messages.length === 0 && (
          <p className="mt-10 text-center text-sm text-slate-500 dark:text-neutral-400">
            {disabledReason ?? 'Ask a question about your documents.'}
          </p>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-lg px-4 py-2.5 text-sm ${
                msg.role === 'user'
                  ? 'bg-slate-900 dark:bg-neutral-100 text-white dark:text-neutral-900'
                  : msg.isError
                    ? 'border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300'
                    : 'border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-slate-800 dark:text-neutral-200'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-3 space-y-2 border-t border-slate-200 dark:border-neutral-800 pt-3">
                  <p className="text-xs font-medium text-slate-500 dark:text-neutral-400">Sources</p>
                  {msg.sources.map((src, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => onSourceClick(src)}
                      title="Open this source in the document viewer"
                      className="block w-full rounded-md bg-slate-50 dark:bg-black px-3 py-2 text-left text-xs text-slate-600 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-neutral-900"
                    >
                      <span className="block font-medium text-slate-800 dark:text-neutral-200">
                        {src.documentName}
                        {src.page != null && ` · page ${src.page}`}
                      </span>
                      <span className="mt-1 line-clamp-4">“{src.excerpt}”</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-lg border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-4 py-2.5 text-sm text-slate-500 dark:text-neutral-400">
              Searching your documents…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={submit} className="flex gap-2 border-t border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) submit(e)
          }}
          rows={1}
          disabled={disabled}
          placeholder={disabled ? 'Waiting for a processed document…' : 'Ask a question…'}
          aria-label="Your question"
          className="flex-1 resize-none rounded-md border border-slate-300 dark:border-neutral-700 px-3 py-2 text-sm focus:border-slate-900 dark:focus:border-neutral-300 focus:outline-none disabled:bg-slate-100 dark:disabled:bg-neutral-800"
        />
        <button
          type="submit"
          disabled={disabled || loading || !input.trim()}
          className="rounded-md bg-slate-900 dark:bg-neutral-100 px-4 py-2 text-sm font-medium text-white dark:text-neutral-900 hover:bg-slate-700 dark:hover:bg-neutral-300 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-neutral-700"
        >
          Send
        </button>
      </form>
    </section>
  )
}
