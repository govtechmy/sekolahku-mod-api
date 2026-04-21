import type { FastifyInstance, onSendHookHandler } from 'fastify'

import { authHeaderSchema, type ListSchoolsSearchQuery, peringkatResponseSchema, schoolTypesResponseSchema } from '@/schemas'
import { listSchoolsSearchQuerySchema } from '@/schemas'

import { getFilterSchoolType, getFilterPeringkat, getSchoolById, getSchoolsSearchSuggestion, listSchools } from '../controllers/schools.controller'
import { authMiddleware } from '../middleware/auth.middleware'

const setNoStoreCacheHeaders: onSendHookHandler = async (_, reply, payload) => {
  reply.header('Cache-Control', 'private, max-age=0, must-revalidate')
  return payload
}

export async function registerSchoolRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/schools',
    {
      preHandler: authMiddleware,
      onSend: [setNoStoreCacheHeaders],
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
      onSend: [setNoStoreCacheHeaders],
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

  app.get(
    '/schools/filter/school-type',
    {
      preHandler: authMiddleware,
      onSend: [setNoStoreCacheHeaders],
      schema: {
        headers: authHeaderSchema,
        response: {
          200: schoolTypesResponseSchema,
        },
        tags: ['Schools'],
        summary: 'schools type filter',
        security: [{ 'Sekolahku-X-Api-Key': [] }],
      },
    },
    getFilterSchoolType,
  )

  app.get(
    '/schools/filter/peringkat',
    {
      preHandler: authMiddleware,
      onSend: [setNoStoreCacheHeaders],
      schema: {
        headers: authHeaderSchema,
        response: {
          200: peringkatResponseSchema,
        },
        tags: ['Schools'],
        summary: 'Peringkat filter',
        security: [{ 'Sekolahku-X-Api-Key': [] }],
      },
    },
    getFilterPeringkat,
  )
}
