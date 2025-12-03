import type { FastifyInstance } from 'fastify'
import type { GetNearbySchoolByLocation } from 'src/schemas/schools/request.schema'
import { getNearbySchoolByLocationSchema } from 'src/schemas/schools/request.schema'

import { authHeaderSchema, type ListSchoolsSearchQuery } from '@/schemas'
import { listSchoolsSearchQuerySchema } from '@/schemas'

import { getNearbySchools, getSchoolById, getSchoolsSearchSuggestion, listSchools } from '../controllers/schools.controller'
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
        security: [{ apiKey: [] }],
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
        security: [{ apiKey: [] }],
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

  app.get<{ Querystring: GetNearbySchoolByLocation }>(
    '/schools/find-nearby',
    {
      preHandler: authMiddleware,
      schema: {
        headers: authHeaderSchema,
        querystring: getNearbySchoolByLocationSchema,
        tags: ['Schools'],
        summary: 'Get nearby schools by location and radius',
      },
    },
    getNearbySchools,
  )
}
