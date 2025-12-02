import mongoose from 'mongoose'

import { connectToDatabase } from '../config/db.config'
import { UserModel } from '../models/user.model'

async function seedUsers() {
  const users = [
    { name: 'Alice Johnson', idNumber: 'U1001', role: 'admin', username: 'alice', email: 'alice@example.com', password: 'not-used' },
    { name: 'Bob Smith', idNumber: 'U1002', role: 'editor', username: 'bob', email: 'bob@example.com', password: 'not-used' },
    { name: 'Charlie Davis', idNumber: 'U1003', role: 'viewer', username: 'charlie', email: 'charlie@example.com', password: 'not-used' },
  ]

  for (const user of users) {
    await UserModel.updateOne({ idNumber: user.idNumber }, { $setOnInsert: user }, { upsert: true })
  }
}

async function main() {
  try {
    await connectToDatabase()
    await seedUsers()
  } catch (error) {
    const message = error instanceof Error ? (error.stack ?? error.message) : String(error)
    process.stderr.write(`${message}\n`)
    process.exitCode = 1
  } finally {
    await mongoose.disconnect()
  }
}

main()
