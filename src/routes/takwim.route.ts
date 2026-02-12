import { authHeaderSchema } from '@schemas'
import type { FastifyInstance } from 'fastify'
import { getTakwimById, getTakwimList } from 'src/controllers/takwim.controller'
import { authMiddleware } from 'src/middleware/auth.middleware'
import { type GetTakwimByIdParams, getTakwimByIdParamsSchema, type ListTakwimsQuery, listTakwimsQuerySchema } from 'src/schemas/takwim'

export async function registerTakwimRoutes(app: FastifyInstance) {
  app.get<{ Querystring: ListTakwimsQuery }>(
    '/takwim',
    {
      preHandler: authMiddleware,
      schema: {
        headers: authHeaderSchema,
        querystring: listTakwimsQuerySchema,
        tags: ['Takwim'],
        summary: 'List all Takwim',
        security: [{ 'Sekolahku-X-Api-Key': [] }],
      },
    },
    getTakwimList,
  )

  app.get<{ Params: GetTakwimByIdParams }>(
    '/takwim/:id',
    {
      preHandler: authMiddleware,
      schema: {
        headers: authHeaderSchema,
        params: getTakwimByIdParamsSchema,
        tags: ['Takwim'],
        summary: 'Get Takwim by ID',
        security: [{ 'Sekolahku-X-Api-Key': [] }],
      },
    },
    getTakwimById,
  )
}
