/**
 * Seed the Atlas Search synonym source collection (`school_synonyms`) from the
 * version-controlled definition at `atlas/synonyms/school_synonyms.json`.
 *
 * Idempotent: replaces the collection contents to match the JSON (JSON is the source of truth).
 *
 * Usage:
 *   bun run seed:synonyms
 *
 * Requires MONGODB_URI in the environment (bun auto-loads .env).
 *
 * NOTE: The Atlas Search index (`sekolah_search`) must reference this collection via its
 * `synonyms` mapping — see atlas/search-indexes/sekolah_search.json. Create/update the index
 * separately (Atlas UI or createSearchIndex/updateSearchIndex).
 */
import { readFileSync } from 'node:fs'

import mongoose from 'mongoose'

type SynonymDoc =
  | { mappingType: 'equivalent'; synonyms: string[] }
  | { mappingType: 'explicit'; input: string[]; synonyms: string[] }

const COLLECTION = 'school_synonyms'

async function main() {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    console.error('[seed-synonyms] MONGODB_URI is not set')
    process.exit(1)
  }

  const jsonPath = new URL('../atlas/synonyms/school_synonyms.json', import.meta.url)
  const docs = JSON.parse(readFileSync(jsonPath, 'utf8')) as SynonymDoc[]

  if (!Array.isArray(docs) || docs.length === 0) {
    console.error('[seed-synonyms] No synonym documents found in JSON')
    process.exit(1)
  }

  const conn = await mongoose.createConnection(uri, { serverSelectionTimeoutMS: 15000 }).asPromise()
  try {
    const coll = conn.collection(COLLECTION)
    await coll.deleteMany({})
    const result = await coll.insertMany(docs)
    console.log(`[seed-synonyms] Seeded ${result.insertedCount} synonym mappings into "${COLLECTION}"`)
  } finally {
    await conn.close()
  }
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('[seed-synonyms] Failed:', err instanceof Error ? err.message : err)
    process.exit(1)
  })
