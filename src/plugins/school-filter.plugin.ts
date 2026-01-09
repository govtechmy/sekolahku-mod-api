import type { FastifyInstance } from 'fastify'

import { getSchoolFilterCache, loadSchoolFilterCacheFromDB, type SchoolFilterCached } from '../services/school.svc'

declare module 'fastify' {
  interface FastifyInstance {
    schoolFilterCache: SchoolFilterCached
  }
}

export async function registerSchoolFilterPlugin(app: FastifyInstance): Promise<void> {
  await loadSchoolFilterCacheFromDB()
  const cache = getSchoolFilterCache()
  app.decorate('schoolFilterCache', cache)

  const counts = {
    schoolTypes: cache.schoolTypes.length,
  }

  app.log.info({ schoolFilterCacheCounts: counts }, `school filter cache loaded into memory (schoolTypes=${counts.schoolTypes})`)
}
