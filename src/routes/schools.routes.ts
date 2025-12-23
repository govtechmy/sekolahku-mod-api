import type { FastifyInstance, onSendHookHandler } from 'fastify'
import type { GetNearbySchoolByLocation as GetFindNearby } from 'src/schemas/schools/request.schema'
import { getNearbySchoolByLocationSchema } from 'src/schemas/schools/request.schema'

import { authHeaderSchema, type ListSchoolsSearchQuery } from '@/schemas'
import { listSchoolsSearchQuerySchema } from '@/schemas'

import { getFindNearby, getSchoolById, getSchoolsSearchSuggestion, listSchools } from '../controllers/schools.controller'
import { authMiddleware } from '../middleware/auth.middleware'

const setValidationCacheHeaders: onSendHookHandler = async (_, reply, payload) => {
  reply.header('Cache-Control', 'private, max-age=0, must-revalidate')
  return payload
}

export async function registerSchoolRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/schools',
    {
      preHandler: authMiddleware,
      onSend: [setValidationCacheHeaders],
      schema: {
        headers: authHeaderSchema,
        tags: ['Schools'],
        summary: 'List schools',
        security: [{ 'Sekolahku-X-Api-Key': [] }],
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
        security: [{ 'Sekolahku-X-Api-Key': [] }],
      },
    },
    getSchoolById,
  )

  app.get<{ Querystring: ListSchoolsSearchQuery }>(
    '/schools/search',
    {
      preHandler: authMiddleware,
      onSend: [setValidationCacheHeaders],
      schema: {
        headers: authHeaderSchema,
        tags: ['Schools'],
        summary: 'Get schools search suggestion',
        security: [{ 'Sekolahku-X-Api-Key': [] }],
        querystring: listSchoolsSearchQuerySchema,
      },
    },
    getSchoolsSearchSuggestion,
  )

  app.get<{ Querystring: GetFindNearby }>(
    '/schools/find-nearby',
    {
      preHandler: authMiddleware,
      onSend: [setValidationCacheHeaders],
      schema: {
        headers: authHeaderSchema,
        querystring: getNearbySchoolByLocationSchema,
        tags: ['Schools'],
        summary: 'Get nearby schools by location and radius',
        security: [{ 'Sekolahku-X-Api-Key': [] }],
      },
    },
    getFindNearby,
  )
}
