import { useEffect, useRef, useState, type DragEvent } from 'react'
import { documentFileUrl } from '../api'
import type { DocumentStatus, UploadedDocument } from '../types'

const MAX_SIZE_MB = 10

interface Props {
  documents: UploadedDocument[]
  selectedId: string | null
  // PDF page to open, e.g. after clicking a source in the chat
  focusPage?: number
  onSelect: (id: string) => void
  onAdd: (file: File) => Promise<void>
  onRemove: (id: string) => Promise<void>
}

const STATUS_LABEL: Partial<Record<DocumentStatus, string>> = {
  uploading: 'Uploading…',
  processing: 'Processing…',
  failed: 'Failed',
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function validateFile(file: File): string | null {
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (ext !== 'pdf' && ext !== 'txt') return `"${file.name}" is not supported. Upload a PDF or TXT file.`
  if (file.size === 0) return `"${file.name}" is empty.`
  if (file.size > MAX_SIZE_MB * 1024 * 1024) return `"${file.name}" is larger than ${MAX_SIZE_MB} MB.`
  return null
}

export default function DocumentViewer({ documents, selectedId, focusPage, onSelect, onAdd, onRemove }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const selected = documents.find((d) => d.id === selectedId) ?? null

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return
    setError(null)
    for (const file of Array.from(files)) {
      const problem = validateFile(file)
      if (problem) {
        setError(problem)
        continue
      }
      try {
        await onAdd(file)
      } catch (err) {
        setError(`"${file.name}" could not be uploaded: ${err instanceof Error ? err.message : 'unknown error'}`)
      }
    }
  }

  async function handleRemove(doc: UploadedDocument) {
    setError(null)
    try {
      await onRemove(doc.id)
    } catch (err) {
      setError(`"${doc.name}" could not be removed: ${err instanceof Error ? err.message : 'unknown error'}`)
    }
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  return (
    <section className="flex min-h-0 flex-col border-b border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 lg:border-r lg:border-b-0">
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-slate-200 dark:border-neutral-800 px-5">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-neutral-100">Documents</h2>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded-md bg-slate-900 dark:bg-neutral-100 px-3 py-1.5 text-sm font-medium text-white dark:text-neutral-900 hover:bg-slate-700 dark:hover:bg-neutral-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 dark:focus-visible:outline-neutral-100"
        >
          Upload
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.txt,application/pdf,text/plain"
          multiple
          hidden
          onChange={(e) => {
            handleFiles(e.target.files)
            e.target.value = ''
          }}
        />
      </header>

      {error && (
        <p role="alert" className="mx-5 mt-3 rounded-md bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      )}

      {documents.length > 0 && (
        <ul className="flex gap-2 overflow-x-auto border-b border-slate-200 dark:border-neutral-800 px-5 py-3">
          {documents.map((doc) => (
            <li key={doc.id} className="shrink-0">
              <div
                className={`flex items-center rounded-md border text-sm ${
                  doc.id === selectedId
                    ? 'border-slate-900 dark:border-neutral-100 bg-slate-900 dark:bg-neutral-100 text-white dark:text-neutral-900'
                    : 'border-slate-200 dark:border-neutral-800 text-slate-700 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-neutral-800'
                }`}
              >
                <button type="button" onClick={() => onSelect(doc.id)} className="flex items-center gap-2 py-1 pr-1 pl-3">
                  <span className="max-w-48 truncate">{doc.name}</span>
                  {STATUS_LABEL[doc.status] && (
                    <span
                      className={`text-xs ${
                        doc.status === 'failed'
                          ? 'font-medium text-red-600 dark:text-red-400'
                          : 'animate-pulse opacity-70'
                      }`}
                    >
                      {STATUS_LABEL[doc.status]}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove(doc)}
                  disabled={doc.status === 'uploading'}
                  aria-label={`Remove ${doc.name}`}
                  className="px-2 py-1 opacity-60 hover:opacity-100 disabled:invisible"
                >
                  ×
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="min-h-0 flex-1">
        {selected ? (
          <div className="flex h-full flex-col">
            <p className="px-5 py-2 text-xs text-slate-500 dark:text-neutral-400">
              {selected.kind.toUpperCase()} · {formatSize(selected.size)}
              {selected.pageCount !== undefined && ` · ${selected.pageCount} pages`}
              {selected.status === 'ready' && selected.chunkCount !== undefined && ` · ${selected.chunkCount} chunks indexed`}
            </p>
            {selected.status === 'failed' && (
              <p role="alert" className="mx-5 mb-3 rounded-md bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-300">
                Processing failed: {selected.error ?? 'unknown error'}
              </p>
            )}
            {selected.status === 'uploading' ? (
              <p className="px-5 text-sm text-slate-500 dark:text-neutral-400">Uploading…</p>
            ) : selected.kind === 'pdf' ? (
              <iframe
                // A new key reloads the viewer, so jumping to another page of the same PDF works
                key={`${selected.id}-${focusPage ?? ''}`}
                // navpanes=0 hides the thumbnail sidebar so the page fits the panel width
                src={`${documentFileUrl(selected.id, selected.name)}#navpanes=0${focusPage ? `&page=${focusPage}` : ''}`}
                title={selected.name}
                className="min-h-96 w-full flex-1 border-0"
              />
            ) : (
              // Keyed so switching files starts with a fresh "Loading…" state
              <TextPreview key={selected.id} id={selected.id} />
            )}
          </div>
        ) : (
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`m-5 flex h-[calc(100%-2.5rem)] min-h-64 flex-col items-center justify-center rounded-lg border-2 border-dashed text-center ${
              dragging ? 'border-slate-900 dark:border-neutral-100 bg-slate-50 dark:bg-black' : 'border-slate-300 dark:border-neutral-700'
            }`}
          >
            <p className="text-sm font-medium text-slate-700 dark:text-neutral-300">Drop a PDF or TXT file here</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-neutral-400">or use the Upload button · max {MAX_SIZE_MB} MB</p>
          </div>
        )}
      </div>
    </section>
  )
}

function TextPreview({ id }: { id: string }) {
  const [text, setText] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch(documentFileUrl(id))
      .then((res) => (res.ok ? res.text() : Promise.reject()))
      .then((body) => !cancelled && setText(body))
      .catch(() => !cancelled && setFailed(true))
    return () => {
      cancelled = true
    }
  }, [id])

  if (failed) return <p className="px-5 text-sm text-red-600 dark:text-red-400">Could not load this file.</p>
  return (
    <pre className="flex-1 overflow-auto px-5 pb-5 font-mono text-sm whitespace-pre-wrap text-slate-800 dark:text-neutral-200">
      {text ?? 'Loading…'}
    </pre>
  )
}
