import { Schema, model } from 'mongoose'

const conversationSchema = new Schema(
  {
    title: { type: String, required: true },
    documentIds: [{ type: Schema.Types.ObjectId, ref: 'Document' }],
  },
  { timestamps: true },
)

export const Conversation = model('Conversation', conversationSchema)
