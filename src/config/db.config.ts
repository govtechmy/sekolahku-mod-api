/* eslint-disable no-console */
import mongoose from 'mongoose'

import { env } from './env.config'

export async function connectToDatabase() {
  try {
    await mongoose.connect(env.MONGODB_URI, {
      directConnection: false,
      retryWrites: true,
      writeConcern: { w: 'majority' },
    })
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${JSON.stringify(error)}`)
    throw error
  }

  // Add connection event handlers
  mongoose.connection.on('connected', () => console.log('MongoDB connected'))
  mongoose.connection.on('error', err => console.error('MongoDB connection error:', err))
  mongoose.connection.on('disconnected', () => console.log('MongoDB disconnected'))
}

export async function disconnectFromDatabase() {
  await mongoose.connection.close()
  console.log('MongoDB connection closed')
}
