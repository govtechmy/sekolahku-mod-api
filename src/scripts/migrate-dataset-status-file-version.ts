/**
 * Migration: add fileVersion field to existing DatasetStatus documents
 *
 * Backfills `fileVersion: null` on any DatasetStatus document that was
 * created before this field was introduced. Safe to run multiple times
 * (idempotent — only updates documents where fileVersion does not exist).
 *
 * Usage:
 *   bun run src/scripts/migrate-dataset-status-file-version.ts
 */

import { connectToDatabase, disconnectFromDatabase } from '../config/db.config'
import { DatasetStatusModel } from '../models'

async function main() {
  try {
    await connectToDatabase()

    const result = await DatasetStatusModel.updateMany({ fileVersion: { $exists: false } }, { $set: { fileVersion: null } })

    process.stdout.write(`Migration complete: ${result.modifiedCount} document(s) updated, ${result.matchedCount} matched.\n`)
  } catch (error) {
    const message = error instanceof Error ? (error.stack ?? error.message) : String(error)
    process.stderr.write(`Migration failed: ${message}\n`)
    process.exitCode = 1
  } finally {
    await disconnectFromDatabase()
  }
}

main()
