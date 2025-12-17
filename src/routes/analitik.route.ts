import { authHeaderSchema } from '@schemas'
import type { FastifyInstance } from 'fastify'
import { getAnalitikData } from 'src/controllers/analitik.controller'
import { authMiddleware } from 'src/middleware/auth.middleware'
import { getAnalitikResponseSchema } from 'src/schemas/analitik/response.schema'

export async function registerAnalitikRoutes(app: FastifyInstance) {
  app.get(
    '/analitik',
    {
      preHandler: authMiddleware,
      schema: {
        headers: authHeaderSchema,
        response: {
          200: getAnalitikResponseSchema,
        },
        tags: ['Analitik'],
        summary: 'Sekolahku Analitik Data',
        security: [{ 'Sekolahku-X-Api-Key': [] }],
      },
    },
    getAnalitikData,
  )
}
