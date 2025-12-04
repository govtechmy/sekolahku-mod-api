import { authHeaderSchema } from '@schemas'
import type { FastifyInstance } from 'fastify'
import { getAcaraById, getAcaraList } from 'src/controllers/acara.controller'
import { getAcaraByIdParamsSchema, listAcarasQuerySchema } from 'src/schemas/acara'

export async function registerAcaraRoutes(app: FastifyInstance) {
  app.get(
    '/acara',
    {
      schema: {
        headers: authHeaderSchema,
        querystring: listAcarasQuerySchema,
        tags: ['Acara'],
        summary: 'List all Acara',
        security: [{ bearerAuth: [] }],
        // security: [{ 'Sekolahku-X-Api-Key': [] }],
      },
    },
    getAcaraList,
  )

  app.get(
    '/acara/:id',
    {
      schema: {
        headers: authHeaderSchema,
        params: getAcaraByIdParamsSchema,
        tags: ['Acara'],
        summary: 'Get Acara by ID',
        security: [{ bearerAuth: [] }],
        // security: [{ 'Sekolahku-X-Api-Key': [] }],
      },
    },
    getAcaraById,
  )
}
