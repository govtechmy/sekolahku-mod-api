import { type PolygonCentroid } from '@types'

import { S3Service } from './s3.svc'

type CentroidIndex = {
  negeri?: string[]
  parlimen?: string[]
  malaysia?: string[]
}

export type CentroidCache = {
  negeri: Record<string, PolygonCentroid>
  parlimen: Record<string, PolygonCentroid>
  malaysia: Record<string, PolygonCentroid>
}

const centroidCache: CentroidCache = {
  negeri: {},
  parlimen: {},
  malaysia: {},
}

function extractNameFromKey(key: string) {
  const parts = key.split('/')
  const filename = parts[parts.length - 1] ?? key
  return filename.replace(/\.json$/i, '')
}

function resolveCentroid(data: unknown): PolygonCentroid {
  if (data && typeof data === 'object' && 'centroid' in data) {
    const centroid = (data as { centroid?: PolygonCentroid }).centroid
    if (centroid) return centroid
  }
  return data as PolygonCentroid
}

async function loadCategory(s3: S3Service, keys: string[] | undefined, target: Record<string, PolygonCentroid>) {
  if (!Array.isArray(keys)) return

  for (const key of keys) {
    const stream = await s3.getStreamObject(key)
    const content = await stream.Body?.transformToString()
    if (!content) continue

    const parsed = JSON.parse(content) as unknown
    const centroid = resolveCentroid(parsed)
    const name = extractNameFromKey(key)
    target[name] = centroid
  }
}

export function getCentroidCache(): CentroidCache {
  return centroidCache
}

export async function loadCentroidCacheFromS3() {
  const s3 = new S3Service()
  const indexKey = 'centroid/index.json'
  const indexStream = await s3.getStreamObject(indexKey)
  const indexContent = await indexStream.Body?.transformToString()
  if (!indexContent) {
    throw new Error(`Failed to read centroid index at key: ${indexKey}`)
  }
  const index = JSON.parse(indexContent) as CentroidIndex

  // Reset cache before reloading
  centroidCache.negeri = {}
  centroidCache.parlimen = {}
  centroidCache.malaysia = {}

  await loadCategory(s3, index.negeri, centroidCache.negeri)
  await loadCategory(s3, index.parlimen, centroidCache.parlimen)
  await loadCategory(s3, index.malaysia, centroidCache.malaysia)

  return centroidCache
}
