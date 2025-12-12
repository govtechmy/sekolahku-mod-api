import { authHeaderSchema } from '@schemas'
import type { FastifyInstance } from 'fastify'
import { getAcaraById, getAcaraList } from 'src/controllers/acara.controller'
import { authMiddleware } from 'src/middleware/auth.middleware'
import { type GetAcaraByIdParams, getAcaraByIdParamsSchema, type ListAcarasQuery, listAcarasQuerySchema } from 'src/schemas/acara'

export async function registerAcaraRoutes(app: FastifyInstance) {
  app.get<{ Querystring: ListAcarasQuery }>(
    '/acara',
    {
      preHandler: authMiddleware,
      schema: {
        headers: authHeaderSchema,
        querystring: listAcarasQuerySchema,
        tags: ['Acara'],
        summary: 'List all Acara',
        security: [{ 'Sekolahku-X-Api-Key': [] }],
      },
    },
    getAcaraList,
  )

  app.get<{ Params: GetAcaraByIdParams }>(
    '/acara/:id',
    {
      preHandler: authMiddleware,
      schema: {
        headers: authHeaderSchema,
        params: getAcaraByIdParamsSchema,
        tags: ['Acara'],
        summary: 'Get Acara by ID',
        security: [{ 'Sekolahku-X-Api-Key': [] }],
      },
    },
    getAcaraById,
  )
}
