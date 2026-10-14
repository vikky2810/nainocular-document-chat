import { Schema, model } from 'mongoose'

const documentSchema = new Schema(
  {
    name: { type: String, required: true },
    kind: { type: String, enum: ['pdf', 'txt'], required: true },
    size: { type: Number, required: true },
    status: { type: String, enum: ['processing', 'ready', 'failed'], default: 'processing' },
    error: { type: String },
    pageCount: { type: Number },
    chunkCount: { type: Number, default: 0 },
  },
  { timestamps: true },
)

export const DocumentModel = model('Document', documentSchema)
