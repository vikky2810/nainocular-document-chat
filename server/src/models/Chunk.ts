import { Schema, model } from 'mongoose'

const chunkSchema = new Schema({
  documentId: { type: Schema.Types.ObjectId, ref: 'Document', required: true, index: true },
  // Copied from the document so search results can be cited without a join
  documentName: { type: String, required: true },
  page: { type: Number },
  index: { type: Number, required: true },
  text: { type: String, required: true },
  embedding: { type: [Number], required: true, select: false },
})

export const Chunk = model('Chunk', chunkSchema)

export const VECTOR_INDEX_NAME = 'chunk_embedding_index'
