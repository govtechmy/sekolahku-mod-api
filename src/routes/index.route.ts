import type { FastifyInstance } from 'fastify'
import mongoose from 'mongoose'

import { registerRevalidateRoute } from './revalidate.route'
import { registerSchoolRoutes } from './schools.routes'

export async function registerApiRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', { schema: { tags: ['System'], summary: 'Healthcheck' } }, async () => {
    const dbReady = mongoose.connection.readyState === 1
    return { status: 'ok', db: dbReady ? 'connected' : 'disconnected' }
  })

  await registerRevalidateRoute(app)
  await registerSchoolRoutes(app)
}
