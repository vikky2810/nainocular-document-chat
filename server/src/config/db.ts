import mongoose from 'mongoose'
import { env } from './env.js'

// Expose `id` instead of `_id` and hide `__v` in every API response
mongoose.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret: Record<string, unknown>) => {
    delete ret._id
    return ret
  },
})

export async function connectDb() {
  try {
    await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 })
  } catch (err) {
    console.error(`Could not connect to MongoDB at ${env.MONGODB_URI}. Is it running? (docker compose up -d)`)
    throw err
  }
  console.log(`MongoDB connected (${mongoose.connection.name})`)
}
