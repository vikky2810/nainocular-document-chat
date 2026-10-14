import type { PageText } from './extract.js'

export interface TextChunk {
  page?: number
  index: number
  text: string
}

// Try to break on paragraphs first, then lines, sentences, words, and finally characters
const SEPARATORS = ['\n\n', '\n', '. ', ' ', '']

// Chunks never cross a page boundary, so every chunk can be cited with one page number
export function chunkPages(pages: PageText[], size: number, overlap: number): TextChunk[] {
  const chunks: TextChunk[] = []
  for (const { page, text } of pages) {
    for (const piece of splitText(normalize(text), SEPARATORS, size, overlap)) {
      chunks.push({ page, index: chunks.length, text: piece })
    }
  }
  return chunks
}

function normalize(text: string) {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function splitText(text: string, separators: string[], size: number, overlap: number): string[] {
  if (!text) return []
  if (text.length <= size) return [text]

  const sepIndex = separators.findIndex((s) => s === '' || text.includes(s))
  const sep = separators[sepIndex]
  const finer = separators.slice(sepIndex + 1)

  const pieces: string[] = []
  for (const part of sep === '' ? [...text] : text.split(sep)) {
    if (!part.trim()) continue
    if (part.length <= size) pieces.push(part)
    else pieces.push(...splitText(part, finer, size, overlap))
  }
  return mergePieces(pieces, sep, size, overlap)
}

// Packs small pieces into chunks of up to `size` chars, starting each new chunk
// with up to `overlap` chars from the end of the previous one
function mergePieces(pieces: string[], sep: string, size: number, overlap: number): string[] {
  const chunks: string[] = []
  const window: string[] = []
  let length = 0

  for (const piece of pieces) {
    const joinCost = window.length ? sep.length : 0
    if (length + joinCost + piece.length > size && window.length) {
      chunks.push(window.join(sep).trim())
      while (window.length && (length > overlap || length + sep.length + piece.length > size)) {
        length -= window[0].length + (window.length > 1 ? sep.length : 0)
        window.shift()
      }
    }
    length += (window.length ? sep.length : 0) + piece.length
    window.push(piece)
  }
  if (window.length) chunks.push(window.join(sep).trim())
  return chunks.filter(Boolean)
}
