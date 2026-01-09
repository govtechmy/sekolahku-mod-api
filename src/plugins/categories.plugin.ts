import type { Categories } from '@types'
import type { FastifyInstance } from 'fastify'
import { getCachedCategories, loadCategoriesFromDB } from 'src/services/categories-cache.svc'

declare module 'fastify' {
  interface FastifyInstance {
    categoriesCache: Categories[]
  }
}

<<<<<<< HEAD
export async function registerCategoriesPlugin(app: FastifyInstance): Promise<void> {
  await loadCategoriesFromDB()
  const cache = await getCachedCategories()
=======
export async function registerArticleCategoriesPlugin(app: FastifyInstance): Promise<void> {
  await loadArticleCategoriesFromDB()
  const cache = await getCachedArticleCategories()
>>>>>>> c48db98 (unmerged from latest, fixed categories schema, rename function)
  app.decorate('categoriesCache', cache)

  app.log.info({ categoriesCacheCount: cache.length }, `categories cache loaded into memory (total=${cache.length})`)
}
