import type { CategoriesDocument } from '@types'
import type { FastifyInstance } from 'fastify'
import { getArticleCachedCategories, loadArticleCategoriesFromDB } from 'src/services/categories-cache.svc'

declare module 'fastify' {
  interface FastifyInstance {
    categoriesCache: CategoriesDocument[]
  }
}

export async function registerArticleCategoriesPlugin(app: FastifyInstance): Promise<void> {
  await loadArticleCategoriesFromDB()
  const cache = await getArticleCachedCategories()
  app.decorate('categoriesCache', cache)

  app.log.info({ categoriesCacheCount: cache.length }, `categories cache loaded into memory (total=${cache.length})`)
}
