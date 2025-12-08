import type { FastifyInstance } from 'fastify'

import { authHeaderSchema, revalidateRequestSchema, revalidateResponseSchema } from '@/schemas'

import { revalidateSchoolEntities } from '../controllers/revalidate.controller'
import { authMiddleware } from '../middleware/auth.middleware'

export async function registerRevalidateRoute(app: FastifyInstance): Promise<void> {
  app.get(
    '/revalidate-school-entity',
    {
      preHandler: authMiddleware,
      schema: {
        headers: authHeaderSchema,
        querystring: revalidateRequestSchema,
        response: {
          200: revalidateResponseSchema,
        },
        tags: ['Revalidate'],
        summary: 'Trigger dataproc revalidation job',
        security: [{ 'Sekolahku-X-Api-Key': [] }],
      },
    },
    revalidateSchoolEntities,
  )
}

