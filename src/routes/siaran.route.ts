import { authHeaderSchema } from '@schemas'
import type { FastifyInstance } from 'fastify'
import { getSiaranById, getSiaranCategories, getSiaranList } from 'src/controllers/siaran.controller'
import { authMiddleware } from 'src/middleware/auth.middleware'
import { type GetSiaranByIdParams, getSiaranByIdParamsSchema, type ListSiaransQuery, listSiaransQuerySchema } from 'src/schemas/siaran'
import { ArticleCategoriesResponseSchema, SiaranByIdResponseSchema, SiaranListResponseSchema } from 'src/schemas/siaran/response.schema'

export async function registerSiaranRoutes(app: FastifyInstance) {
  app.get<{ Querystring: ListSiaransQuery }>(
    '/siaran',
    {
      preHandler: authMiddleware,
      schema: {
        headers: authHeaderSchema,
        response: {
          200: SiaranListResponseSchema.describe('List all Siaran'),
        },
        querystring: listSiaransQuerySchema,
        tags: ['Siaran'],
        summary: 'List all Siaran',
        security: [{ 'Sekolahku-X-Api-Key': [] }],
      },
    },
    getSiaranList,
  )

  app.get(
    '/siaran/categories',
    {
      preHandler: authMiddleware,
      schema: {
        headers: authHeaderSchema,
        response: {
          200: ArticleCategoriesResponseSchema.describe('Fetch all Siaran categories'),
        },
        tags: ['Siaran'],
        summary: 'Get all Siaran categories',
        security: [{ 'Sekolahku-X-Api-Key': [] }],
      },
    },
    getSiaranCategories,
  )

  app.get<{ Params: GetSiaranByIdParams }>(
    '/siaran/:id',
    {
      preHandler: authMiddleware,
      schema: {
        headers: authHeaderSchema,
        response: {
          200: SiaranByIdResponseSchema.describe('Get Siaran by ID'),
        },
        params: getSiaranByIdParamsSchema,
        tags: ['Siaran'],
        summary: 'Get Siaran by ID',
        security: [{ 'Sekolahku-X-Api-Key': [] }],
      },
    },
    getSiaranById,
  )
}
