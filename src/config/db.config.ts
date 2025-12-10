/* eslint-disable no-console */
import mongoose from 'mongoose'

import { env } from './env.config'

const connectionOptions: mongoose.ConnectOptions = {
  directConnection: false,
  retryWrites: true,
  writeConcern: { w: 'majority' },
}

export const sekolahkuConnection = mongoose.createConnection()
export const payloadConnection = mongoose.createConnection()

export async function connectToDatabase() {
  const errors: Array<{ db: string; error: unknown }> = []

  try {
    await sekolahkuConnection.openUri(env.MONGODB_URI, connectionOptions)

    sekolahkuConnection.on('connected', () => console.log('✓ Sekolahku DB connected'))
    sekolahkuConnection.on('error', err => console.error('✗ Sekolahku DB error:', err))
    sekolahkuConnection.on('disconnected', () => console.log('✗ Sekolahku DB disconnected'))
  } catch (error) {
    console.error(`✗ Error connecting to Sekolahku DB: ${JSON.stringify(error)}`)
    errors.push({ db: 'sekolahku', error })
  }

  try {
    await payloadConnection.openUri(env.MONGODB_URI_PAYLOAD, connectionOptions)

    payloadConnection.on('connected', () => console.log('✓ Payload DB connected'))
    payloadConnection.on('error', err => console.error('✗ Payload DB error:', err))
    payloadConnection.on('disconnected', () => console.log('✗ Payload DB disconnected'))
  } catch (error) {
    console.error(`✗ Error connecting to Payload DB: ${JSON.stringify(error)}`)
    errors.push({ db: 'payload', error })
  }

  if (errors.length === 2) {
    throw new Error(`Failed to connect to all databases: ${JSON.stringify(errors)}`)
  }

  // Log warnings for partial failures
  if (errors.length > 0) {
    console.warn('⚠ Warning: Some databases failed to connect. Running with partial functionality.')
    errors.forEach(({ db, error }) => {
      console.warn(`⚠ ${db} database unavailable:`, error)
    })
  }
}

export async function disconnectFromDatabase() {
  const disconnectPromises: Promise<void>[] = []

  if (sekolahkuConnection?.readyState === 1) {
    disconnectPromises.push(sekolahkuConnection.close())
  }

  if (payloadConnection?.readyState === 1) {
    disconnectPromises.push(payloadConnection.close())
  }

  await Promise.all(disconnectPromises)
}
