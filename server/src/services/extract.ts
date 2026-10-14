import { extractText, getDocumentProxy } from 'unpdf'

export interface PageText {
  // 1-based page number; undefined for TXT files, which have no pages
  page?: number
  text: string
}

export async function extractPages(buffer: Buffer, kind: 'pdf' | 'txt'): Promise<PageText[]> {
  if (kind === 'txt') return [{ text: buffer.toString('utf8') }]

  let text: string[]
  try {
    const pdf = await getDocumentProxy(new Uint8Array(buffer))
    ;({ text } = await extractText(pdf, { mergePages: false }))
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'unknown error'
    throw new Error(`Could not read this PDF. It may be damaged or password-protected (${reason}).`)
  }
  return text.map((pageText, i) => ({ page: i + 1, text: pageText }))
}
