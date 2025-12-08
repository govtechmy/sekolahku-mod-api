import mongoose from 'mongoose'

import { connectToDatabase } from '../config/db.config'

async function main() {
  try {
    await connectToDatabase()
  } catch (error) {
    const message = error instanceof Error ? (error.stack ?? error.message) : String(error)
    process.stderr.write(`${message}\n`)
    process.exitCode = 1
  } finally {
    await mongoose.disconnect()
  }
}

main()
