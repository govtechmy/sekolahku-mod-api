import { authHeaderSchema } from '@schemas'
import type { FastifyInstance } from 'fastify'
import { getAnalitikData, getFilterSchoolTypeWithPeringkat } from 'src/controllers/analitik.controller'
import { authMiddleware } from 'src/middleware/auth.middleware'
import type { FilterSchoolTypeWithPeringkatQuery } from 'src/schemas/analitik/response.schema'
import {
  filterSchoolTypeWithPeringkatQuerySchema,
  getAnalitikResponseSchema,
  getFilterSchoolTypeWithPeringkatResponseSchema,
} from 'src/schemas/analitik/response.schema'

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

  app.get<{ Querystring: FilterSchoolTypeWithPeringkatQuery }>(
    '/analitik/filter/school',
    {
      preHandler: authMiddleware,
      schema: {
        headers: authHeaderSchema,
        querystring: filterSchoolTypeWithPeringkatQuerySchema,
        response: {
          200: getFilterSchoolTypeWithPeringkatResponseSchema,
        },
        tags: ['Analitik'],
        summary: 'Filter School Type by Peringkat',
        security: [{ 'Sekolahku-X-Api-Key': [] }],
      },
    },
    getFilterSchoolTypeWithPeringkat,
  )
}
