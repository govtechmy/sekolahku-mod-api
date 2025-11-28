import type { FastifyInstance } from 'fastify'
import { type ListSchoolsSearchQuery, listSchoolsSearchQuerySchema } from 'src/schemas/schools/request.schema'

import { authHeaderSchema } from '@/schemas'

import { getSchoolById, getSchoolsSearchSuggestion, listSchools } from '../controllers/schools.controller'
import { authMiddleware } from '../middleware/auth.middleware'

export async function registerSchoolRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/schools',
    {
      preHandler: authMiddleware,
      schema: {
        headers: authHeaderSchema,
        tags: ['Schools'],
        summary: 'List schools',
        security: [{ bearerAuth: [] }],
      },
    },
    listSchools,
  )

  app.get<{ Params: { id: string } }>(
    '/schools/:id',
    {
      preHandler: authMiddleware,
      schema: {
        headers: authHeaderSchema,
        tags: ['Schools'],
        summary: 'Get school by ID',
        security: [{ bearerAuth: [] }],
      },
    },
    getSchoolById,
  )

  app.get<{ Querystring: ListSchoolsSearchQuery }>(
    '/schools/search',
    {
      preHandler: authMiddleware,
      schema: {
        headers: authHeaderSchema,
        tags: ['Schools'],
        summary: 'Get schools search suggestion',
        security: [{ bearerAuth: [] }],
        querystring: listSchoolsSearchQuerySchema,
      },
    },
    getSchoolsSearchSuggestion,
  )
}
