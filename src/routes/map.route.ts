import type { FastifyInstance, onSendHookHandler } from 'fastify'
import type { GetNearbySchoolByLocation as GetFindNearby } from 'src/schemas/schools/request.schema'
import { getNearbySchoolByLocationSchema } from 'src/schemas/schools/request.schema'

import { authHeaderSchema } from '@/schemas'

import { getFindNearby } from '../controllers/map.controller'
import { authMiddleware } from '../middleware/auth.middleware'

const setNoStoreCacheHeaders: onSendHookHandler = async (_, reply, payload) => {
  reply.header('Cache-Control', 'private, max-age=0, must-revalidate')
  return payload
}

export async function registerMapRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: GetFindNearby }>(
    '/schools/find-nearby',
    {
      preHandler: authMiddleware,
      onSend: [setNoStoreCacheHeaders],
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
