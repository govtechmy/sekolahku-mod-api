import type { Categories } from '@types'
import type { FastifyInstance } from 'fastify'
import { getCachedCategories, loadCategoriesFromDB } from 'src/services/categories-cache.svc'

declare module 'fastify' {
  interface FastifyInstance {
    categoriesCache: Categories[]
  }
}

export async function registerCategoriesPlugin(app: FastifyInstance): Promise<void> {
  await loadCategoriesFromDB()
  const cache = await getCachedCategories()
  app.decorate('categoriesCache', cache)

  app.log.info({ categoriesCacheCount: cache.length }, `categories cache loaded into memory (total=${cache.length})`)
}
