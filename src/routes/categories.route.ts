import type { GetCategoriesByIdParams } from '@schemas'
import { authHeaderSchema } from '@schemas'
import type { FastifyInstance } from 'fastify'
import { getCategories, getCategoryById } from 'src/controllers/categories.controller'
import { authMiddleware } from 'src/middleware/auth.middleware'

export async function registerCategoriesRoutes(app: FastifyInstance) {
  app.get(
    '/categories',
    {
      preHandler: authMiddleware,
      schema: {
        headers: authHeaderSchema,
        tags: ['Categories'],
        summary: 'Get all Categories',
        security: [{ 'Sekolahku-X-Api-Key': [] }],
      },
    },
    getCategories,
  )

  app.get<{ Params: GetCategoriesByIdParams }>(
    '/categories/:id',
    {
      preHandler: authMiddleware,
      schema: {
        headers: authHeaderSchema,
        tags: ['Categories'],
        summary: 'Get Category by ID',
        security: [{ 'Sekolahku-X-Api-Key': [] }],
      },
    },
    getCategoryById,
  )
}
