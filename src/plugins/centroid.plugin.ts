import type { FastifyInstance } from 'fastify'

import { type CentroidCache, getCentroidCache, loadCentroidCacheFromS3 } from '../services/centroid-cache.svc'

declare module 'fastify' {
  interface FastifyInstance {
    centroidCache: CentroidCache
  }
}

export async function registerCentroidPlugin(app: FastifyInstance): Promise<void> {
  await loadCentroidCacheFromS3()
  const cache = getCentroidCache()
  app.decorate('centroidCache', cache)

  const counts = {
    negeri: Object.keys(cache.negeri).length,
    parlimen: Object.keys(cache.parlimen).length,
    malaysia: Object.keys(cache.malaysia).length,
  }

  app.log.info(
    { centroidCacheCounts: counts },
    `centroid cache loaded into memory (negeri=${counts.negeri}, parlimen=${counts.parlimen}, malaysia=${counts.malaysia})`,
  )
}
