import { useState } from 'react'
import ChatPanel from './components/ChatPanel'
import DocumentViewer from './components/DocumentViewer'
import ThemeToggle from './components/ThemeToggle'
import { useChat } from './hooks/useChat'
import { useDocuments } from './hooks/useDocuments'
import { useTheme } from './hooks/useTheme'
import type { Source } from './types'

function App() {
  const { theme, toggleTheme } = useTheme()
  const { documents, loadError, upload, remove } = useDocuments()
  const chat = useChat()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [focusPage, setFocusPage] = useState<number | undefined>()

  // Fall back to the first document when nothing (or a removed document) is selected
  const activeId = documents.some((d) => d.id === selectedId) ? selectedId : (documents[0]?.id ?? null)

  const readyIds = documents.filter((d) => d.status === 'ready').map((d) => d.id)
  const stillWorking = documents.some((d) => d.status === 'uploading' || d.status === 'processing')
  const disabledReason =
    documents.length === 0
      ? 'Upload a document to start asking questions.'
      : readyIds.length === 0
        ? stillWorking
          ? 'Your documents are still being processed…'
          : 'None of your documents could be processed. Upload another file.'
        : null

  function selectDocument(id: string, page?: number) {
    setSelectedId(id)
    setFocusPage(page)
  }

  async function addDocument(file: File) {
    selectDocument(await upload(file))
  }

  return (
    <div className="flex h-screen flex-col bg-slate-100 dark:bg-black text-slate-900 dark:text-neutral-100">
      <header className="flex items-center justify-between border-b border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-5 py-2">
        <h1 className="text-base font-semibold">Nainocular Document Chat</h1>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </header>
      {loadError && (
        <p role="alert" className="bg-red-50 dark:bg-red-950/40 px-5 py-2 text-sm text-red-700 dark:text-red-300">
          {loadError}
        </p>
      )}
      <main className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] lg:grid-cols-2 lg:grid-rows-1">
        <DocumentViewer
          documents={documents}
          selectedId={activeId}
          focusPage={focusPage}
          onSelect={(id) => selectDocument(id)}
          onAdd={addDocument}
          onRemove={remove}
        />
        <ChatPanel
          messages={chat.messages}
          loading={chat.loading}
          disabledReason={disabledReason}
          conversations={chat.conversations}
          conversationId={chat.conversationId}
          onSend={(question) => chat.send(question, readyIds)}
          onNewChat={chat.newChat}
          onOpenConversation={chat.openConversation}
          onSourceClick={(src: Source) => selectDocument(src.documentId, src.page)}
        />
      </main>
    </div>
  )
}

export default App
