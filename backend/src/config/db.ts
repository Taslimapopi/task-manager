import mongoose from 'mongoose'
import {env} from "@config/env.js"


export const connectDB = async (): Promise<void> => {
  await mongoose.connect(env.MONGODB_URI)
  console.log('MongoDB connected')
}

export const disconnectDB = async (): Promise<void> => {
  await mongoose.disconnect()
}