import { useEffect, useState } from 'react'
import { deleteDocument, getDocument, listDocuments, uploadDocument } from '../api'
import type { UploadedDocument } from '../types'

const POLL_INTERVAL_MS = 1500

export function useDocuments() {
  const [documents, setDocuments] = useState<UploadedDocument[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    listDocuments()
      .then(setDocuments)
      .catch((err: Error) => setLoadError(err.message))
  }, [])

  // While any document is processing, poll it until it becomes ready or failed
  const processingIds = documents
    .filter((d) => d.status === 'processing')
    .map((d) => d.id)
    .join(',')

  useEffect(() => {
    if (!processingIds) return
    const timer = setInterval(async () => {
      const updates = await Promise.all(processingIds.split(',').map((id) => getDocument(id).catch(() => null)))
      setDocuments((prev) => prev.map((d) => updates.find((u) => u?.id === d.id) ?? d))
    }, POLL_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [processingIds])

  // Shows the file straight away as "uploading", then swaps in the server's record
  async function upload(file: File) {
    const tempId = `uploading-${crypto.randomUUID()}`
    const kind = file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'txt'
    setDocuments((prev) => [...prev, { id: tempId, name: file.name, kind, size: file.size, status: 'uploading' }])
    try {
      const doc = await uploadDocument(file)
      setDocuments((prev) => prev.map((d) => (d.id === tempId ? doc : d)))
      return doc.id
    } catch (err) {
      setDocuments((prev) => prev.filter((d) => d.id !== tempId))
      throw err
    }
  }

  async function remove(id: string) {
    await deleteDocument(id)
    setDocuments((prev) => prev.filter((d) => d.id !== id))
  }

  return { documents, loadError, upload, remove }
}
