import type { FastifyInstance } from 'fastify'

import { authHeaderSchema, type CreateSchoolBody, createSchoolBodySchema } from '@/schemas'

import { createSchool, getSchoolById, listSchools } from '../controllers/schools.controller'
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

  app.post<{ Body: CreateSchoolBody }>(
    '/schools',
    {
      preHandler: [authMiddleware],
      schema: {
        headers: authHeaderSchema,
        body: createSchoolBodySchema,
        tags: ['Schools'],
        summary: 'Create a school',
        security: [{ bearerAuth: [] }],
      },
    },
    createSchool,
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
}
