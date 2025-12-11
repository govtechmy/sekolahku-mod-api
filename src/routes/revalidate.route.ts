import type { FastifyInstance } from 'fastify'

import { authHeaderSchema, revalidateRequestSchema, revalidateParamsSchema, revalidateResponseSchema } from '@/schemas'
import type { RevalidateParams } from '@/schemas'

import { revalidateSchoolEntities } from '../controllers/revalidate.controller'
import { authMiddleware } from '../middleware/auth.middleware'

export async function registerRevalidateRoute(app: FastifyInstance): Promise<void> {
  app.get<{ Params: RevalidateParams }>(
    '/revalidate/:servicePath',
    {
      preHandler: authMiddleware,
      schema: {
        headers: authHeaderSchema,
        params: revalidateParamsSchema,
        querystring: revalidateRequestSchema,
        response: {
          200: revalidateResponseSchema,
        },
        tags: ['Revalidate'],
        summary: 'Trigger dynamic dataproc revalidation job',
        security: [{ 'Sekolahku-X-Api-Key': [] }],
      },
    },
    revalidateSchoolEntities,
  )
}
