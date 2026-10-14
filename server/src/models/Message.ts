import { Schema, model } from 'mongoose'

const sourceSchema = new Schema(
  {
    documentId: { type: Schema.Types.ObjectId, ref: 'Document', required: true },
    documentName: { type: String, required: true },
    page: { type: Number },
    excerpt: { type: String, required: true },
    similarity: { type: Number },
  },
  { _id: false },
)

const messageSchema = new Schema(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    sources: { type: [sourceSchema], default: undefined },
  },
  { timestamps: true },
)

export const Message = model('Message', messageSchema)
