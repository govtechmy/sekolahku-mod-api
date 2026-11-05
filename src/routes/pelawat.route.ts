import { authHeaderSchema } from '@schemas'
import type { FastifyInstance } from 'fastify'
import { getPelawat } from 'src/controllers/pelawat.controller'
import { authMiddleware } from 'src/middleware/auth.middleware'

export async function registerPelawatRoutes(app: FastifyInstance) {
  app.get(
    '/pelawat',
    {
      preHandler: authMiddleware,
      schema: {
        headers: authHeaderSchema,
        tags: ['Pelawat'],
        summary: 'Visitor counts (today and overall) from Umami',
        security: [{ 'Sekolahku-X-Api-Key': [] }],
      },
    },
    getPelawat,
  )
}
