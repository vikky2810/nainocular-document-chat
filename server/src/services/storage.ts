import { mkdir, rm, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// server/uploads, resolved the same way from src/ (tsx) and dist/ (node)
const UPLOAD_DIR = fileURLToPath(new URL('../../uploads/', import.meta.url))

export function storedFilePath(id: string, kind: 'pdf' | 'txt') {
  return path.join(UPLOAD_DIR, `${id}.${kind}`)
}

export async function saveFile(id: string, kind: 'pdf' | 'txt', buffer: Buffer) {
  await mkdir(UPLOAD_DIR, { recursive: true })
  await writeFile(storedFilePath(id, kind), buffer)
}

export async function deleteFile(id: string, kind: 'pdf' | 'txt') {
  await rm(storedFilePath(id, kind), { force: true })
}
