import { authHeaderSchema } from '@schemas'
import type { FastifyInstance } from 'fastify'
import { getSiaranById, getSiaranList } from 'src/controllers/siaran.controller'
import { getSiaranByIdParamsSchema, listSiaransQuerySchema } from 'src/schemas/siaran'

export async function registerSiaranRoutes(app: FastifyInstance) {
  app.get(
    '/siaran',
    {
      schema: {
        headers: authHeaderSchema,
        querystring: listSiaransQuerySchema,
        tags: ['Siaran'],
        summary: 'List all Siaran',
        security: [{ bearerAuth: [] }],
        // security: [{ apiKey: [] }], use this once merged
      },
    },
    getSiaranList,
  )

  app.get(
    '/siaran/:id',
    {
      schema: {
        headers: authHeaderSchema,
        params: getSiaranByIdParamsSchema,
        tags: ['Siaran'],
        summary: 'Get Siaran by ID',
        security: [{ bearerAuth: [] }],
        // security: [{ apiKey: [] }], use this once merged
      },
    },
    getSiaranById,
  )
}
