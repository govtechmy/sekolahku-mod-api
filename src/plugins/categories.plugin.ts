import type { Categories } from '@types'
import type { FastifyInstance } from 'fastify'
import { getCachedArticleCategories, loadArticleCategoriesFromDB } from 'src/services/categories-cache.svc'

declare module 'fastify' {
  interface FastifyInstance {
    categoriesCache: Categories[]
  }
}

export async function registerCategoriesPlugin(app: FastifyInstance): Promise<void> {
  await loadArticleCategoriesFromDB()
  const cache = await getCachedArticleCategories()
  app.decorate('categoriesCache', cache)

  app.log.info({ categoriesCacheCount: cache.length }, `categories cache loaded into memory (total=${cache.length})`)
}
