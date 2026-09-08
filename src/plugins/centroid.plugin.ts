import type { FastifyInstance } from 'fastify'

import { env } from '../config/env.config'
import { type CentroidCache, getCentroidCache, loadCentroidCacheFromS3 } from '../services/centroid-cache.svc'

declare module 'fastify' {
  interface FastifyInstance {
    centroidCache: CentroidCache
  }
}

export async function registerCentroidPlugin(app: FastifyInstance): Promise<void> {
  try {
    await loadCentroidCacheFromS3()
  } catch (error) {
    if (env.APP_ENV !== 'local') throw error
    app.log.warn({ err: error }, 'centroid cache unavailable in local development')
  }
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
